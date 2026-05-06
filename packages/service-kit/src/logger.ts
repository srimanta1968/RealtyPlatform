import { pino } from 'pino';
import type { FastifyBaseLogger } from 'fastify';

/**
 * Service-kit's `Logger` type intentionally aliases Fastify's
 * `FastifyBaseLogger`. Both Pino loggers (created via `createLogger` below)
 * and the per-request logger Fastify exposes as `app.log` are assignable to
 * this type, so handlers can pass `app.log` straight into helpers without
 * ceremony.
 */
export type Logger = FastifyBaseLogger;

export interface CreateLoggerOptions {
  service: string;
  level?: pino.LevelWithSilent;
  pretty?: boolean;
}

/**
 * Build a stand-alone Pino logger. Used by code paths that don't run inside
 * Fastify (e.g. agents, scripts). Inside services, prefer `app.log`.
 */
export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level = 'info', pretty = process.env.NODE_ENV !== 'production' } = options;
  return pino({
    name: service,
    level,
    transport: pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
    base: { service },
  }) as unknown as Logger;
}
