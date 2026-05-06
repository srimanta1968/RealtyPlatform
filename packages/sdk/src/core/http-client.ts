import { ConflictError, SdkError, UnauthorizedError, ValidationError } from './errors.js';
import type { TokenStorage } from './auth.js';

export interface HttpClientOptions {
  baseUrl?: string;
  tokenStorage?: TokenStorage;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** When false, do not attach Authorization header even if a token exists. */
  authenticated?: boolean;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenStorage?: TokenStorage;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
    this.tokenStorage = options.tokenStorage;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /** Issue an HTTP request and parse a JSON response, mapping errors to typed classes. */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(this.defaultHeaders);
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) headers.set(k, v);
    }
    if (options.authenticated !== false && this.tokenStorage) {
      const token = this.tokenStorage.read();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });

    const text = await response.text();
    const parsed: unknown = text ? safeJson(text) : null;
    if (response.ok) return parsed as T;

    const message = pickMessage(parsed) ?? `Request failed: ${response.status}`;
    if (response.status === 400 || response.status === 422) throw new ValidationError(message, parsed);
    if (response.status === 401 || response.status === 403) throw new UnauthorizedError(message, parsed);
    if (response.status === 409) throw new ConflictError(message, parsed);
    throw new SdkError(message, response.status, parsed);
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function pickMessage(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const value = (payload as { error: unknown }).error;
    if (typeof value === 'string') return value;
  }
  return null;
}
