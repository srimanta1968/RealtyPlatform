import type { EventBus } from '@kiana/event-bus';
import type { DomainEvent } from '@kiana/contracts';
import type { Logger } from '@kiana/service-kit';

export interface EventSubscriptionOptions<E extends DomainEvent> {
  bus: EventBus;
  eventType: E['event_type'];
  consumerGroup: string;
  handler: (event: E) => Promise<unknown>;
  logger: Logger;
  /** How long to wait before polling again after a subscribe() error. */
  pollIntervalMs?: number;
}

export interface EventSubscriptionHandle {
  stop(): Promise<void>;
}

/**
 * Generic poll-based subscription wrapper around @kiana/event-bus. Each
 * call to bus.subscribe() blocks for up to 5s waiting for stream entries,
 * processes them, and returns; this loop immediately re-subscribes so
 * delivery is continuous. Task 13's Redis Streams adapter swaps this
 * skeleton for a long-running consumer with retry + DLQ semantics — at
 * which point the loop here collapses to a single subscribe() call.
 *
 * Per-event errors from `handler` are caught and logged so a single bad
 * envelope cannot tear the loop down — the message is xack'd by the bus
 * adapter only after the handler resolves, so failed deliveries naturally
 * end up in the consumer-group pending list for redelivery.
 */
export function startEventSubscription<E extends DomainEvent>(
  options: EventSubscriptionOptions<E>,
): EventSubscriptionHandle {
  const { bus, eventType, consumerGroup, handler, logger, pollIntervalMs = 1000 } = options;
  let stopped = false;

  const wrappedHandler = async (event: E): Promise<void> => {
    try {
      await handler(event);
    } catch (err) {
      logger.error(
        { err, eventType, event_id: event.event_id },
        `${eventType} handler raised — event will redeliver via consumer-group pending list`,
      );
    }
  };

  void (async () => {
    while (!stopped) {
      try {
        await bus.subscribe<E>(eventType, consumerGroup, wrappedHandler);
      } catch (err) {
        if (stopped) break;
        logger.error({ err, eventType }, 'event-bus subscribe failed; backing off');
        await delay(pollIntervalMs);
      }
    }
  })();

  return {
    async stop() {
      stopped = true;
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
