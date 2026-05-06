import type { EventBus, Subscription } from '@kiana/event-bus';
import type { DomainEvent } from '@kiana/contracts';
import type { Logger } from '@kiana/service-kit';

export interface EventSubscriptionOptions<E extends DomainEvent> {
  bus: EventBus;
  eventType: E['event_type'];
  consumerGroup: string;
  handler: (event: E) => Promise<unknown>;
  logger: Logger;
  /** Override the default delivery-attempt cap before DLQ-ing. */
  maxAttempts?: number;
}

export type EventSubscriptionHandle = Subscription;

/**
 * Thin pass-through to bus.consume() that swallows handler return values
 * (the bus contract expects `Promise<void>`) and reuses the service-kit
 * Logger for retry / DLQ visibility. Each subscription gets its own
 * consumer name so multiple notification-service replicas can share a
 * consumer group with independent pending lists.
 */
export function startEventSubscription<E extends DomainEvent>(
  options: EventSubscriptionOptions<E>,
): EventSubscriptionHandle {
  const { bus, eventType, consumerGroup, handler, logger, maxAttempts } = options;

  return bus.consume<E>(
    eventType,
    consumerGroup,
    async (event) => {
      await handler(event);
    },
    {
      logger: {
        info: (obj, msg) => logger.info(obj, msg),
        warn: (obj, msg) => logger.warn(obj, msg),
        error: (obj, msg) => logger.error(obj, msg),
      },
      ...(maxAttempts !== undefined ? { maxAttempts } : {}),
    },
  );
}
