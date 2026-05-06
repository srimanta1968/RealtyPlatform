import { AuthClient } from '../clients/auth/client.js';
import { LeadClient } from '../clients/lead/client.js';
import { HttpClient } from '../core/http-client.js';

export interface ServerSdk {
  auth: AuthClient;
  leads: LeadClient;
}

export interface CreateServerSdkOptions {
  baseUrl: string;
  /** Bearer token forwarded from the incoming request (if any). */
  authToken?: string;
}

/**
 * Build a server-side SDK for Next.js Server Components / Route Handlers.
 * The HttpClient uses an in-memory token reader so the request's auth
 * cookie / header is forwarded without touching the browser store.
 */
export function createServerSdk(options: CreateServerSdkOptions): ServerSdk {
  const http = new HttpClient({
    baseUrl: options.baseUrl,
    tokenStorage: options.authToken
      ? {
          read: () => options.authToken ?? null,
          write: () => undefined,
          clear: () => undefined,
        }
      : undefined,
  });
  return {
    auth: new AuthClient(http),
    leads: new LeadClient(http),
  };
}
