import type { FastifyReply, FastifyRequest } from 'fastify';

import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';
import { createServiceClient, type ServiceClient } from '@kiana/service-client';

const SERVICE_NAME = 'web-bff';
const DEFAULT_PORT = 4000;

const SERVICE_TOKEN = process.env.SERVICE_TOKEN ?? 'dev-shared-secret';

interface BackendUrls {
  user: string;
  lead: string;
  property: string;
  crm: string;
  notification: string;
}

function loadBackendUrls(): BackendUrls {
  return {
    user: process.env.USER_SERVICE_URL ?? 'http://localhost:4010',
    lead: process.env.LEAD_SERVICE_URL ?? 'http://localhost:4011',
    property: process.env.PROPERTY_SERVICE_URL ?? 'http://localhost:4012',
    crm: process.env.CRM_SERVICE_URL ?? 'http://localhost:4013',
    notification: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4014',
  };
}

/** Forward the caller's Authorization header so downstream services see the user JWT. */
function forwardAuthHeaders(request: FastifyRequest): Record<string, string> {
  const auth = request.headers.authorization;
  return auth ? { Authorization: auth } : {};
}

type ProxyMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function makeProxyHandler(
  client: ServiceClient,
  method: ProxyMethod,
  path: string,
  successStatus: number,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const headers = forwardAuthHeaders(request);
      const init = { headers };
      let result: unknown;
      switch (method) {
        case 'GET':
          result = await client.get(path, init);
          break;
        case 'POST':
          result = await client.post(path, request.body, init);
          break;
        case 'PATCH':
          result = await client.patch(path, request.body, init);
          break;
        case 'DELETE':
          result = await client.delete(path, init);
          break;
      }
      return reply.code(successStatus).send(result);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      const body = (err as { body?: unknown }).body ?? {
        success: false,
        error: 'Upstream user-service error',
      };
      return reply.code(status).send(body);
    }
  };
}

/**
 * Build the web-bff Fastify instance. The BFF holds NO business logic — every
 * route here is a thin proxy / aggregator over downstream microservices.
 */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const backends = loadBackendUrls();

  const userClient = createServiceClient({
    baseUrl: backends.user,
    serviceToken: SERVICE_TOKEN,
  });
  const leadClient = createServiceClient({
    baseUrl: backends.lead,
    serviceToken: SERVICE_TOKEN,
  });

  return createServer({
    config,
    version: '0.1.0',
    registerRoutes: async (app) => {
      app.post('/api/auth/register', makeProxyHandler(userClient, 'POST', '/api/auth/register', 201));
      app.post('/api/auth/login', makeProxyHandler(userClient, 'POST', '/api/auth/login', 200));
      app.get('/api/auth/me', makeProxyHandler(userClient, 'GET', '/api/auth/me', 200));
      app.post('/api/auth/logout', makeProxyHandler(userClient, 'POST', '/api/auth/logout', 200));
      app.post(
        '/api/auth/verify-email',
        makeProxyHandler(userClient, 'POST', '/api/auth/verify-email', 200),
      );
      app.post(
        '/api/auth/resend-verification',
        makeProxyHandler(userClient, 'POST', '/api/auth/resend-verification', 200),
      );

      // Leads — public capture (Task 5), admin reads (Task 7), stage updates (Task 8).
      app.post('/api/leads', makeProxyHandler(leadClient, 'POST', '/api/leads', 201));
      app.get('/api/leads/sources', makeProxyHandler(leadClient, 'GET', '/api/leads/sources', 200));
      app.get<{ Querystring: { days?: string; workflow?: string } }>(
        '/api/leads/stale',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const params = new URLSearchParams();
            if (request.query.days) params.set('days', request.query.days);
            if (request.query.workflow) params.set('workflow', request.query.workflow);
            const qs = params.toString();
            const result = await leadClient.get(
              qs ? `/api/leads/stale?${qs}` : '/api/leads/stale',
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream lead-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );
      app.get('/api/leads', makeProxyHandler(leadClient, 'GET', '/api/leads', 200));
      app.get<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.get(`/api/leads/${encodeURIComponent(request.params.id)}`, {
            headers,
          });
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream lead-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.patch<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.patch(
            `/api/leads/${encodeURIComponent(request.params.id)}`,
            request.body,
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream lead-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.get<{ Params: { id: string }; Querystring: { workflow?: string } }>(
        '/api/leads/:id/execution',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const qs = request.query.workflow
              ? `?workflow=${encodeURIComponent(request.query.workflow)}`
              : '';
            const result = await leadClient.get(
              `/api/leads/${encodeURIComponent(request.params.id)}/execution${qs}`,
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream lead-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );
      app.post<{ Params: { id: string }; Querystring: { workflow?: string } }>(
        '/api/leads/:id/advance',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const qs = request.query.workflow
              ? `?workflow=${encodeURIComponent(request.query.workflow)}`
              : '';
            const result = await leadClient.post(
              `/api/leads/${encodeURIComponent(request.params.id)}/advance${qs}`,
              request.body,
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream lead-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );

      // Workflows — static catalog (Task 9) + funnel metrics (Task 11) hosted by lead-service.
      app.get('/api/workflows', makeProxyHandler(leadClient, 'GET', '/api/workflows', 200));
      app.get<{ Params: { slug: string } }>('/api/workflows/:slug', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.get(
            `/api/workflows/${encodeURIComponent(request.params.slug)}`,
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream lead-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.get<{ Params: { slug: string } }>(
        '/api/workflows/:slug/metrics',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const result = await leadClient.get(
              `/api/workflows/${encodeURIComponent(request.params.slug)}/metrics`,
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream lead-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );
    },
  });
}
