import { Redis } from 'ioredis';

import type { DomainEvent } from '@kiana/contracts';

type RedisClient = InstanceType<typeof Redis>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<E extends DomainEvent>(
    eventName: E['name'],
    consumerGroup: string,
    handler: (event: E) => Promise<void>,
  ): Promise<void>;
  close(): Promise<void>;
}

export interface CreateEventBusOptions {
  redisUrl: string;
  streamPrefix?: string;
}

/**
 * Redis Streams-backed event bus. Phase 1-3 starting point — switch to
 * Kafka in Phase 4+ by swapping this implementation while keeping the
 * EventBus contract stable.
 */
export function createEventBus(options: CreateEventBusOptions): EventBus {
  const client: RedisClient = new Redis(options.redisUrl, { lazyConnect: false });
  const prefix = options.streamPrefix ?? 'kiana:events';

  return {
    async publish(event) {
      const stream = `${prefix}:${event.name}`;
      await client.xadd(stream, '*', 'payload', JSON.stringify(event));
    },
    async subscribe(eventName, consumerGroup, handler) {
      const stream = `${prefix}:${eventName}`;
      try {
        await client.xgroup('CREATE', stream, consumerGroup, '$', 'MKSTREAM');
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (!message.includes('BUSYGROUP')) {
          throw err;
        }
      }
      const consumer = `${consumerGroup}-${process.pid}`;
      // Single-shot read for the simple-prototype version; production pulls
      // this into a long-running loop with retry + DLQ semantics.
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
