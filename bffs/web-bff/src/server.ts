import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';
import { createServiceClient } from '@kiana/service-client';

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

  return createServer({
    config,
    version: '0.1.0',
    registerRoutes: async (app) => {
      // Auth — proxied straight through to user-service.
      app.post('/api/auth/register', async (request, reply) => {
        try {
          const result = await userClient.post<unknown>('/api/auth/register', request.body);
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
    },
  });
}
