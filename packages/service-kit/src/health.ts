import type { FastifyInstance } from 'fastify';

export interface HealthRoutesOptions {
  service: string;
  version?: string;
  /** Optional liveness probe — must throw to fail. */
  ready?: () => Promise<void>;
}

/** Register `/health` (liveness) and `/health/ready` (readiness) endpoints. */
export function registerHealthRoutes(app: FastifyInstance, options: HealthRoutesOptions): void {
  app.get('/health', async () => ({
    status: 'ok',
    service: options.service,
    version: options.version ?? '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      if (options.ready) {
        await options.ready();
      }
      return { status: 'ready', service: options.service };
    } catch (err) {
      app.log.warn({ err }, 'Readiness check failed');
      return reply.code(503).send({ status: 'not_ready', service: options.service });
    }
  });
}
