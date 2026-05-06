/**
 * Ambient declarations for the optional observability SDKs. These
 * packages are NOT in @kiana/service-kit/package.json — deployments
 * that opt into tracing / metrics install them separately. Declaring
 * them here as `any` lets the dynamic-import sites in tracing.ts and
 * metrics.ts type-check without forcing the deps on every install.
 */
declare module '@opentelemetry/sdk-node' {
  export class NodeSDK {
    constructor(config?: unknown);
    start(): Promise<void>;
    shutdown(): Promise<void>;
  }
}

declare module '@opentelemetry/resources' {
  export class Resource {
    constructor(attributes: Record<string, unknown>);
  }
}

declare module '@opentelemetry/semantic-conventions' {
  export const SemanticResourceAttributes: {
    SERVICE_NAME: string;
    SERVICE_VERSION: string;
  };
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  export class OTLPTraceExporter {
    constructor(config?: { url?: string });
  }
}

declare module '@opentelemetry/auto-instrumentations-node' {
  export function getNodeAutoInstrumentations(): unknown[];
}

declare module '@opentelemetry/api' {
  export interface SpanContext {
    traceId: string;
    spanId: string;
  }
  export interface Span {
    spanContext(): SpanContext;
  }
  export const trace: {
    getActiveSpan(): Span | undefined;
  };
}

declare module 'prom-client' {
  export const register: {
    contentType: string;
    metrics(): Promise<string>;
  };
  export function collectDefaultMetrics(opts?: { register?: unknown }): void;
}
