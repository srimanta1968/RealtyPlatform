import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { registerHealthRoutes } from './health.js';
import type { ServiceConfig } from './config.js';
import { registerMetricsRoute } from './metrics.js';
import { createOtelLogMixin, initTracing, type TracingHandle } from './tracing.js';

export type KianaFastify = FastifyInstance;

export interface CreateServerOptions {
  config: ServiceConfig;
  version?: string;
  /** Optional readiness probe (e.g. ping the DB). */
  ready?: () => Promise<void>;
  /** Async callback to register service routes. */
  registerRoutes: (app: KianaFastify) => Promise<void> | void;
  /** Disable automatic tracing/metrics wiring (rare — tests / CLI). */
  disableObservability?: boolean;
}

/**
 * Build a Fastify instance with the platform-standard middleware stack:
 * structured Pino logging (with OpenTelemetry trace_id/span_id mixin
 * when the SDK is loaded), CORS, Helmet, sensible (httpErrors), JWT
 * auth, /health + /health/ready endpoints, and a /metrics scrape route.
 *
 * The OpenTelemetry SDK + prom-client are optional — initTracing /
 * registerMetricsRoute log a single notice and no-op when the packages
 * aren't installed. Deployments that need traces install
 * @opentelemetry/sdk-node + the OTLP exporter and set
 * OTEL_EXPORTER_OTLP_ENDPOINT; metrics need prom-client.
 *
 * The caller plugs in routes via `registerRoutes`; per-request fields
 * (request_id, route, method) are already captured by Fastify's default
 * request logger.
 */
export async function createServer(options: CreateServerOptions): Promise<KianaFastify> {
  const { config, ready, registerRoutes, version, disableObservability } = options;

  const otelMixin = disableObservability ? undefined : createOtelLogMixin();

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
      ...(otelMixin ? { mixin: otelMixin } : {}),
    },
    disableRequestLogging: false,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'request_id',
  });

  let tracingHandle: TracingHandle | null = null;
  if (!disableObservability) {
    tracingHandle = await initTracing({
      service: config.service,
      version,
      logger: app.log,
    });
    app.addHook('onClose', async () => {
      if (tracingHandle) {
        await tracingHandle.shutdown();
      }
    });
  }

  await app.register(helmet, { global: true });
  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  await app.register(sensible);
  await app.register(jwt, { secret: config.jwtSecret });

  registerHealthRoutes(app, { service: config.service, version, ready });

  if (!disableObservability) {
    await registerMetricsRoute(app, { service: config.service, logger: app.log });
  }

  await registerRoutes(app);

  return app;
}
