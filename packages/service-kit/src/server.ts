import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerHealthRoutes } from './health.js';
import type { ServiceConfig } from './config.js';

export type KianaFastify = FastifyInstance;

export interface CreateServerOptions {
  config: ServiceConfig;
  version?: string;
  /** Optional readiness probe (e.g. ping the DB). */
  ready?: () => Promise<void>;
  /** Async callback to register service routes. */
  registerRoutes: (app: KianaFastify) => Promise<void> | void;
}

/**
 * Build a Fastify instance with the platform-standard middleware stack:
 * structured logging, CORS, Helmet, sensible (httpErrors), JWT auth, and
 * `/health` + `/health/ready` endpoints. The caller plugs in routes.
 *
 * Fastify owns the pino logger (it expects FastifyBaseLogger which adds
 * `msgPrefix` on top of pino's BaseLogger) — we just hand it options.
 */
export async function createServer(options: CreateServerOptions): Promise<KianaFastify> {
  const { config, ready, registerRoutes, version } = options;

  const app = Fastify({
    logger: {
      name: config.service,
      level: config.logLevel,
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            }
          : undefined,
      base: { service: config.service },
    },
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { global: true });
  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(sensible);
  await app.register(jwt, { secret: config.jwtSecret });

  registerHealthRoutes(app, { service: config.service, version, ready });

  await registerRoutes(app);

  return app;
}
