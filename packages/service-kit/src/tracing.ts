import type { Logger } from './logger.js';

export interface TracingOptions {
  service: string;
  /** Service version for resource attributes; defaults to 'unknown'. */
  version?: string;
  /**
   * Override the OTLP HTTP endpoint. When omitted the SDK reads
   * OTEL_EXPORTER_OTLP_ENDPOINT from the environment per the spec.
   */
  otlpEndpoint?: string;
  logger: Logger;
}

export interface TracingHandle {
  /** Flush + shutdown the tracer provider; safe to call repeatedly. */
  shutdown(): Promise<void>;
}

const NOOP_HANDLE: TracingHandle = {
  shutdown: async () => undefined,
};

/**
 * Initialise the OpenTelemetry NodeSDK with auto-instrumentations and an
 * OTLP HTTP trace exporter. Returns a handle whose shutdown() flushes
 * any in-flight spans on process exit.
 *
 * The SDK packages — @opentelemetry/sdk-node + auto-instrumentations +
 * the OTLP exporter — are optional dependencies. Local dev runs without
 * them and gets a no-op handle (logger emits a single INFO line so ops
 * can confirm the deployment intentionally skipped tracing). Production
 * pipelines install the packages and set OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * The init is deliberately late (called from createServer()): proper
 * auto-instrumentation wants to monkey-patch BEFORE Fastify loads, but
 * the Phase-1 trade-off favours one place to wire telemetry over a
 * service-side preload script. P3+ moves this to a -r tracing.js
 * preload once we add a dedicated bin/.
 */
export async function initTracing(options: TracingOptions): Promise<TracingHandle> {
  const { service, version = 'unknown', otlpEndpoint, logger } = options;
  const enabled =
    process.env.OTEL_SDK_DISABLED !== 'true' &&
    (otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  if (!enabled) {
    logger.info(
      { service },
      '[tracing] OTEL_EXPORTER_OTLP_ENDPOINT not set — OpenTelemetry disabled (set the env var to enable)',
    );
    return NOOP_HANDLE;
  }

  let sdkMod: typeof import('@opentelemetry/sdk-node');
  let resourcesMod: typeof import('@opentelemetry/resources');
  let semconvMod: typeof import('@opentelemetry/semantic-conventions');
  let exporterMod: typeof import('@opentelemetry/exporter-trace-otlp-http');
  let autoInstrMod: typeof import('@opentelemetry/auto-instrumentations-node');
  try {
    [sdkMod, resourcesMod, semconvMod, exporterMod, autoInstrMod] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/auto-instrumentations-node'),
    ]);
  } catch (err) {
    logger.warn(
      { err, service },
      '[tracing] OpenTelemetry packages not installed — skipping SDK init (set OTEL_EXPORTER_OTLP_ENDPOINT and add the @opentelemetry/* deps to enable)',
    );
    return NOOP_HANDLE;
  }

  const resource = new resourcesMod.Resource({
    [semconvMod.SemanticResourceAttributes.SERVICE_NAME]: service,
    [semconvMod.SemanticResourceAttributes.SERVICE_VERSION]: version,
  });

  const exporter = new exporterMod.OTLPTraceExporter(
    otlpEndpoint ? { url: otlpEndpoint } : undefined,
  );

  const sdk = new sdkMod.NodeSDK({
    resource,
    traceExporter: exporter,
    instrumentations: [autoInstrMod.getNodeAutoInstrumentations()],
  });

  await sdk.start();
  logger.info(
    { service, otlpEndpoint: otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT },
    '[tracing] OpenTelemetry SDK started',
  );

  return {
    async shutdown() {
      try {
        await sdk.shutdown();
      } catch (err) {
        logger.error({ err, service }, '[tracing] OpenTelemetry shutdown failed');
      }
    },
  };
}

/**
 * Pino mixin that attaches the active OpenTelemetry trace_id / span_id
 * to every log line so logs and traces correlate in the observability
 * backend. When @opentelemetry/api isn't installed (or no span is
 * active) the mixin returns an empty object, leaving log shape
 * unchanged.
 */
export function createOtelLogMixin(): () => Record<string, unknown> {
  let apiMod: typeof import('@opentelemetry/api') | null = null;
  let triedLoad = false;

  return () => {
    if (!triedLoad) {
      triedLoad = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        apiMod = require('@opentelemetry/api') as typeof import('@opentelemetry/api');
      } catch {
        apiMod = null;
      }
    }
    if (!apiMod) return {};
    const span = apiMod.trace.getActiveSpan();
    const ctx = span?.spanContext();
    if (!ctx) return {};
    return { trace_id: ctx.traceId, span_id: ctx.spanId };
  };
}
