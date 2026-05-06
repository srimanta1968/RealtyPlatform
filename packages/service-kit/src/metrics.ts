import type { FastifyInstance } from 'fastify';

import type { Logger } from './logger.js';

export interface MetricsOptions {
  service: string;
  logger: Logger;
  /** Path the Prometheus scraper hits. Defaults to '/metrics'. */
  metricsPath?: string;
  /** When true, default Node.js process metrics are collected. Defaults to true. */
  collectDefaults?: boolean;
}

export interface MetricsHandle {
  /** True when prom-client was loaded and metrics are being recorded. */
  enabled: boolean;
}

/**
 * Register the Prometheus /metrics endpoint plus default process
 * collectors. prom-client is an optional dependency — when it's not
 * installed the route is skipped (logged) and Phase-1 deployments that
 * don't ship metrics still boot cleanly.
 *
 * Counters / histograms specific to a domain (e.g. lead_dispatched_total)
 * register against the same prom-client default registry from the owning
 * service so /metrics surfaces them automatically.
 */
export async function registerMetricsRoute(
  app: FastifyInstance,
  options: MetricsOptions,
): Promise<MetricsHandle> {
  const { service, logger, metricsPath = '/metrics', collectDefaults = true } = options;
  let promMod: typeof import('prom-client');
  try {
    promMod = await import('prom-client');
  } catch {
    logger.warn(
      { service },
      '[metrics] prom-client is not installed — skipping /metrics route (add prom-client to dependencies to enable)',
    );
    return { enabled: false };
  }

  if (collectDefaults) {
    promMod.collectDefaultMetrics({ register: promMod.register });
  }

  app.get(metricsPath, async (_request, reply) => {
    reply.header('Content-Type', promMod.register.contentType);
    return promMod.register.metrics();
  });

  logger.info({ service, metricsPath }, '[metrics] /metrics endpoint registered');
  return { enabled: true };
}
