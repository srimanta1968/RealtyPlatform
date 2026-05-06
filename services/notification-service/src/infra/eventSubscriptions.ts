import { createEventBus, type EventBus } from '@kiana/event-bus';
import type { LeadCreated } from '@kiana/contracts';
import type { Logger } from '@kiana/service-kit';

import type { LeadCreatedSubscriber } from '../domain/leadEvents.js';

export interface LeadCreatedSubscriptionOptions {
  redisUrl: string;
  consumerGroup: string;
  subscriber: LeadCreatedSubscriber;
  logger: Logger;
  /** How long to wait before polling again after subscribe() returns. */
  pollIntervalMs?: number;
}

export interface LeadCreatedSubscriptionHandle {
  bus: EventBus;
  stop(): Promise<void>;
}

/**
 * Wire the lead.created subscriber to @kiana/event-bus. Phase-1 spins a
 * polling loop on top of the single-shot subscribe primitive — each call
 * blocks for up to 5s waiting for new entries, processes them, and returns;
 * the loop immediately re-subscribes. Task 13 (Redis Streams adapter)
 * replaces this with a proper long-running consumer + DLQ semantics.
 *
 * The handler swallows per-event errors so a single bad envelope cannot
 * tear down the loop — failures are already captured in notification_sends
 * by the subscriber itself.
 */
export function startLeadCreatedSubscription(
  options: LeadCreatedSubscriptionOptions,
): LeadCreatedSubscriptionHandle {
  const { redisUrl, consumerGroup, subscriber, logger, pollIntervalMs = 1000 } = options;
  const bus = createEventBus({ redisUrl });
  let stopped = false;

  const handler = async (event: LeadCreated): Promise<void> => {
    try {
      await subscriber.handle(event);
    } catch (err) {
      logger.error(
        { err, event_id: event.event_id, lead_id: event.payload.lead_id },
        'lead.created handler raised — event will redeliver via consumer-group pending list',
      );
    }
  };

  void (async () => {
    while (!stopped) {
      try {
        await bus.subscribe<LeadCreated>('lead.created', consumerGroup, handler);
      } catch (err) {
        if (stopped) break;
        logger.error({ err }, 'event-bus subscribe failed; backing off');
        await delay(pollIntervalMs);
      }
    }
  })();

  return {
    bus,
    async stop() {
      stopped = true;
      await bus.close();
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
