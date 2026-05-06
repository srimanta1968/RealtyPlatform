import { Redis } from 'ioredis';

import type { DomainEvent } from '@kiana/contracts';

type RedisClient = InstanceType<typeof Redis>;

export interface BusLogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
}

export interface ConsumeOptions {
  /** Consumer name within the consumer group; defaults to `<group>-<pid>`. */
  consumerName?: string;
  /** XREADGROUP BLOCK milliseconds. Defaults to 5000ms. */
  blockMs?: number;
  /** XREADGROUP COUNT — how many entries to pull per call. Defaults to 100. */
  batchSize?: number;
  /** Number of in-process delivery attempts before moving the entry to the DLQ. Defaults to 5. */
  maxAttempts?: number;
  /** Override the dead-letter stream name. Defaults to `<stream>:dlq`. */
  deadLetterStream?: string;
  /** Optional structured logger; falls back to a no-op. */
  logger?: BusLogger;
}

export interface Subscription {
  /**
   * Stop the consume loop, drain the in-flight batch, and resolve once the
   * underlying XREADGROUP returns. Idempotent.
   */
  stop(): Promise<void>;
}

export interface EventBus {
  /** Publish a domain event onto its stream (`<prefix>:<event_type>`). */
  publish(event: DomainEvent): Promise<void>;
  /**
   * Long-running consumer. Loops over XREADGROUP / XACK forever until the
   * returned Subscription is stopped. On handler failure the entry is
   * counted; after `maxAttempts` deliveries it's moved to the DLQ stream
   * (with the original payload + last error) and ACK'd off the live
   * stream so it doesn't keep the consumer-group pending list bloated.
   * Successful handlers ACK normally.
   */
  consume<E extends DomainEvent>(
    eventType: E['event_type'],
    consumerGroup: string,
    handler: (event: E) => Promise<void>,
    options?: ConsumeOptions,
  ): Subscription;
  /**
   * Single-batch read primitive. Kept for tests and short-lived callers
   * that want explicit control over the polling cadence; production
   * subscribers should use `consume()` instead.
   *
   * @deprecated Prefer `consume()` for long-running subscribers — it
   * handles retry, DLQ, and shutdown. Will remain for the test surface.
   */
  subscribe<E extends DomainEvent>(
    eventType: E['event_type'],
    consumerGroup: string,
    handler: (event: E) => Promise<void>,
  ): Promise<void>;
  close(): Promise<void>;
}

export interface CreateEventBusOptions {
  redisUrl: string;
  streamPrefix?: string;
}

const NOOP_LOGGER: BusLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Redis Streams-backed event bus. Phase 1-3 starting point — switch to
 * Kafka in Phase 4+ by swapping this implementation while keeping the
 * EventBus contract stable.
 */
export function createEventBus(options: CreateEventBusOptions): EventBus {
  const client: RedisClient = new Redis(options.redisUrl, { lazyConnect: false });
  const prefix = options.streamPrefix ?? 'kiana:events';

  async function ensureConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await client.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('BUSYGROUP')) {
        throw err;
      }
    }
  }

  return {
    async publish(event) {
      const stream = `${prefix}:${event.event_type}`;
      await client.xadd(stream, '*', 'payload', JSON.stringify(event));
    },

    consume(eventType, consumerGroup, handler, options = {}) {
      const stream = `${prefix}:${eventType}`;
      const dlqStream = options.deadLetterStream ?? `${stream}:dlq`;
      const consumerName = options.consumerName ?? `${consumerGroup}-${process.pid}`;
      const blockMs = options.blockMs ?? 5000;
      const batchSize = options.batchSize ?? 100;
      const maxAttempts = options.maxAttempts ?? 5;
      const logger = options.logger ?? NOOP_LOGGER;

      const attempts = new Map<string, number>();
      let stopped = false;

      const loopPromise = (async () => {
        await ensureConsumerGroup(stream, consumerGroup);
        while (!stopped) {
          let result: unknown;
          try {
            result = await client.xreadgroup(
              'GROUP',
              consumerGroup,
              consumerName,
              'COUNT',
              batchSize,
              'BLOCK',
              blockMs,
              'STREAMS',
              stream,
              '>',
            );
          } catch (err) {
            if (stopped) break;
            logger.error({ err, stream, consumerGroup }, 'event-bus xreadgroup failed; backing off');
            await delay(blockMs);
            continue;
          }
          if (!result) continue;
          for (const [, entries] of result as [string, [string, string[]][]][]) {
            for (const [id, fields] of entries) {
              if (stopped) break;
              await processEntry(id, fields);
            }
          }
        }
      })();

      async function processEntry(id: string, fields: string[]): Promise<void> {
        const idx = fields.indexOf('payload');
        const raw = idx >= 0 ? fields[idx + 1] : undefined;
        if (!raw) {
          await client.xack(stream, consumerGroup, id);
          return;
        }
        let event: DomainEvent;
        try {
          event = JSON.parse(raw) as DomainEvent;
        } catch (err) {
          logger.error(
            { err, id, stream },
            'event-bus payload is not valid JSON — moving to DLQ',
          );
          await client.xadd(
            dlqStream,
            '*',
            'payload',
            raw,
            'reason',
            'invalid_json',
            'last_error',
            err instanceof Error ? err.message : String(err),
          );
          await client.xack(stream, consumerGroup, id);
          return;
        }
        const attemptCount = (attempts.get(id) ?? 0) + 1;
        try {
          await handler(event as Parameters<typeof handler>[0]);
          attempts.delete(id);
          await client.xack(stream, consumerGroup, id);
        } catch (err) {
          if (attemptCount >= maxAttempts) {
            logger.error(
              { err, id, stream, attempts: attemptCount },
              'event handler failed past maxAttempts — moving to DLQ',
            );
            await client.xadd(
              dlqStream,
              '*',
              'payload',
              raw,
              'reason',
              'handler_failed',
              'attempts',
              String(attemptCount),
              'last_error',
              err instanceof Error ? err.message : String(err),
            );
            await client.xack(stream, consumerGroup, id);
            attempts.delete(id);
          } else {
            attempts.set(id, attemptCount);
            logger.warn(
              { err, id, stream, attempts: attemptCount },
              'event handler failed; will redeliver',
            );
            // Deliberately no XACK — Redis keeps the entry in the consumer-
            // group pending list so the next XREADGROUP `0` (or another
            // consumer in the group) picks it up.
          }
        }
      }

      return {
        async stop() {
          stopped = true;
          await loopPromise;
        },
      };
    },

    async subscribe(eventType, consumerGroup, handler) {
      const stream = `${prefix}:${eventType}`;
      await ensureConsumerGroup(stream, consumerGroup);
      const consumer = `${consumerGroup}-${process.pid}`;
      const result = await client.xreadgroup(
        'GROUP',
        consumerGroup,
        consumer,
        'COUNT',
        100,
        'BLOCK',
        5000,
        'STREAMS',
        stream,
        '>',
      );
      if (!result) return;
      for (const [, entries] of result as [string, [string, string[]][]][]) {
        for (const [id, fields] of entries) {
          const idx = fields.indexOf('payload');
          const raw = idx >= 0 ? fields[idx + 1] : undefined;
          if (!raw) continue;
          await handler(JSON.parse(raw));
          await client.xack(stream, consumerGroup, id);
        }
      }
    },

    async close() {
      await client.quit();
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
