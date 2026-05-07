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
  const propertyClient = createServiceClient({
    baseUrl: backends.property,
    serviceToken: SERVICE_TOKEN,
  });
  const crmClient = createServiceClient({
    baseUrl: backends.crm,
    serviceToken: SERVICE_TOKEN,
  });
  const notificationClient = createServiceClient({
    baseUrl: backends.notification,
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
      app.delete<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.delete(
            `/api/leads/${encodeURIComponent(request.params.id)}`,
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

      // Lead :id sub-routes (Phase-1 Tasks 18 / 19 / 20).
      app.get<{ Params: { id: string } }>(
        '/api/leads/:id/timeline',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const result = await leadClient.get(
              `/api/leads/${encodeURIComponent(request.params.id)}/timeline`,
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
      app.post<{ Params: { id: string } }>('/api/leads/:id/notes', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.post(
            `/api/leads/${encodeURIComponent(request.params.id)}/notes`,
            request.body,
            { headers },
          );
          return reply.code(201).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream lead-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.patch<{ Params: { id: string } }>('/api/leads/:id/owner', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await leadClient.patch(
            `/api/leads/${encodeURIComponent(request.params.id)}/owner`,
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

      // Properties — public reads (Task 17), admin CRUD + publish (Tasks 15/16).
      app.get<{
        Querystring: {
          type?: string;
          location?: string;
          price_min_minor?: string;
          price_max_minor?: string;
        };
      }>('/api/properties', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const params = new URLSearchParams();
          for (const k of ['type', 'location', 'price_min_minor', 'price_max_minor'] as const) {
            const v = request.query[k];
            if (v !== undefined && v !== '') params.set(k, v);
          }
          const qs = params.toString();
          const result = await propertyClient.get(
            qs ? `/api/properties?${qs}` : '/api/properties',
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream property-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.post('/api/properties', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await propertyClient.post('/api/properties', request.body, { headers });
          return reply.code(201).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream property-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.patch<{ Params: { id: string } }>(
        '/api/properties/:id/publish',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const result = await propertyClient.patch(
              `/api/properties/${encodeURIComponent(request.params.id)}/publish`,
              request.body,
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream property-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );
      app.patch<{ Params: { id: string } }>('/api/properties/:id', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await propertyClient.patch(
            `/api/properties/${encodeURIComponent(request.params.id)}`,
            request.body,
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream property-service error',
          };
          return reply.code(status).send(body);
        }
      });
      // Slug detail — must be registered AFTER /:id/publish + /:id so Fastify
      // doesn't match the literal "publish" as a slug.
      app.get<{ Params: { slug: string } }>('/api/properties/:slug', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await propertyClient.get(
            `/api/properties/${encodeURIComponent(request.params.slug)}`,
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream property-service error',
          };
          return reply.code(status).send(body);
        }
      });

      // CRM kanban (Task 21) — owner_id + per_stage_limit are optional.
      app.get<{ Querystring: { owner_id?: string; per_stage_limit?: string } }>(
        '/api/crm/pipeline',
        async (request, reply) => {
          try {
            const headers = forwardAuthHeaders(request);
            const params = new URLSearchParams();
            if (request.query.owner_id) params.set('owner_id', request.query.owner_id);
            if (request.query.per_stage_limit) {
              params.set('per_stage_limit', request.query.per_stage_limit);
            }
            const qs = params.toString();
            const result = await crmClient.get(
              qs ? `/api/crm/pipeline?${qs}` : '/api/crm/pipeline',
              { headers },
            );
            return reply.code(200).send(result);
          } catch (err) {
            const status = (err as { status?: number }).status ?? 500;
            const body = (err as { body?: unknown }).body ?? {
              success: false,
              error: 'Upstream crm-service error',
            };
            return reply.code(status).send(body);
          }
        },
      );

      // Staff invites (Task 22).
      app.post('/api/users/invite', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await userClient.post('/api/users/invite', request.body, { headers });
          return reply.code(201).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream user-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.post('/api/users/accept-invite', async (request, reply) => {
        try {
          const result = await userClient.post('/api/users/accept-invite', request.body);
          return reply.code(201).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream user-service error',
          };
          return reply.code(status).send(body);
        }
      });

      // Service _status probes — diagnostic endpoints, also used by the
      // test runner to confirm each service booted with its domain wired.
      app.get('/api/notifications/_status', makeProxyHandler(notificationClient, 'GET', '/api/notifications/_status', 200));
      app.post('/api/notifications/templates', async (request, reply) => {
        try {
          const headers = forwardAuthHeaders(request);
          const result = await notificationClient.post(
            '/api/notifications/templates',
            request.body,
            { headers },
          );
          return reply.code(200).send(result);
        } catch (err) {
          const status = (err as { status?: number }).status ?? 500;
          const body = (err as { body?: unknown }).body ?? {
            success: false,
            error: 'Upstream notification-service error',
          };
          return reply.code(status).send(body);
        }
      });
      app.get('/api/crm/_status', makeProxyHandler(crmClient, 'GET', '/api/crm/_status', 200));
      app.get('/api/properties/_status', makeProxyHandler(propertyClient, 'GET', '/api/properties/_status', 200));
    },
  });
}
