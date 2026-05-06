import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

const SERVICE_NAME = 'crm-service';
const DEFAULT_PORT = 4013;

export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  return createServer({
    config,
    version: '0.1.0',
    registerRoutes: async (app) => {
      app.get('/api/workflows/_status', async () => ({
        success: true,
        data: { service: SERVICE_NAME, scaffolded: true },
      }));
    },
  });
}
