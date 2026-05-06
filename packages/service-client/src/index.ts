export class ServiceClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ServiceClientError';
  }
}

export interface ServiceClientOptions {
  baseUrl: string;
  /** Service-to-service shared secret or mTLS-derived identity header. */
  serviceToken?: string;
  /** Default per-request timeout in ms. */
  timeoutMs?: number;
  /** Trace propagation hook (W3C traceparent). */
  getTraceHeaders?: () => Record<string, string>;
}

export interface ServiceClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  patch<T>(path: string, body: unknown, init?: RequestInit): Promise<T>;
  delete<T>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * Build a typed internal client targeting another microservice. Adds
 * service-token auth, sane defaults, and structured error mapping.
 */
export function createServiceClient(options: ServiceClientOptions): ServiceClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const timeout = options.timeoutMs ?? 5_000;

  async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    if (options.serviceToken) headers.set('x-service-token', options.serviceToken);
    if (options.getTraceHeaders) {
      for (const [k, v] of Object.entries(options.getTraceHeaders())) {
        headers.set(k, v);
      }
    }

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      const parsed: unknown = text ? safeJson(text) : null;
      if (!response.ok) {
        throw new ServiceClientError(
          `Service call failed: ${method} ${path} → ${response.status}`,
          response.status,
          parsed,
        );
      }
      return parsed as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
    delete: (path, init) => request('DELETE', path, undefined, init),
  };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
