import type { DomainEvent, EventEnvelope } from '@kiana/contracts';
import { makeEnvelope, type MakeEnvelopeContext } from '@kiana/contracts';

import type { TimelineRepository } from './timelineRepository.js';

/**
 * Minimal contract every domain emits against. The DefaultEventPublisher
 * below writes to lead_timeline_events for durable replay AND logs the
 * envelope to stdout; the @kiana/event-bus Redis Streams adapter (Phase 1
 * Task #13) will plug in here without any caller changes.
 */
export interface EventPublisher {
  publish<TName extends string, TPayload>(
    envelope: EventEnvelope<TName, TPayload>,
  ): Promise<void>;
}

export type PublishContext = MakeEnvelopeContext;

export { makeEnvelope } from '@kiana/contracts';

export interface DefaultEventPublisherOptions {
  timeline: TimelineRepository;
  /** Pulled out of `lead_id` in the payload when present. Other event subjects ignore this side channel. */
  leadIdSelector?: (event: DomainEvent) => string | null;
  logger?: { info: (obj: unknown, msg?: string) => void };
}

/**
 * Default in-process publisher. Two concurrent side-effects per publish:
 *
 *  1. Append to lead_timeline_events when the event has a lead_id, so the
 *     read-side timeline endpoint stays accurate without a separate writer.
 *  2. Structured-log the full envelope for ops visibility until the Redis
 *     Streams adapter ships in Phase 1 Task #13.
 *
 * Subscribers don't exist yet (no event-bus). This is intentional — Phase 1
 * §6 mandates 'emit events from day one' so consumers Phase 2+ plug in
 * without retrofitting; the wire shape is locked here.
 */
export function createDefaultEventPublisher(options: DefaultEventPublisherOptions): EventPublisher {
  const { timeline, logger, leadIdSelector } = options;
  return {
    async publish(envelope) {
      logger?.info({ event: envelope }, `event ${envelope.event_type}`);
      const select = leadIdSelector ?? defaultLeadIdSelector;
      const leadId = select(envelope as DomainEvent);
      if (leadId) {
        try {
          await timeline.append({
            leadId,
            type: envelope.event_type,
            payload: envelope.payload,
            actorId: envelope.actor.id,
          });
        } catch (err) {
          logger?.info({ err, event: envelope.event_type }, 'timeline append failed');
        }
      }
    },
  };
}

function defaultLeadIdSelector(event: DomainEvent): string | null {
  const payload = event.payload as Record<string, unknown> | null | undefined;
  if (payload && typeof payload === 'object' && 'lead_id' in payload) {
    const candidate = (payload as { lead_id?: unknown }).lead_id;
    return typeof candidate === 'string' ? candidate : null;
  }
  return null;
}
