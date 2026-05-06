import { pino, type Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

export interface CreateLoggerOptions {
  service: string;
  level?: pino.LevelWithSilent;
  pretty?: boolean;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const { service, level = 'info', pretty = process.env.NODE_ENV !== 'production' } = options;
  return pino({
    name: service,
    level,
    transport: pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
    base: { service },
  });
}
