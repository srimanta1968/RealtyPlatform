import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

const SERVICE_NAME = 'lead-service';
const DEFAULT_PORT = 4011;

/**
 * Lead service bootstrap. Real route handlers land in subsequent tasks
 * (Task 5: Lead Capture, Task 6: Lead Sources, Task 7: Management UI,
 *  Task 8: Status Tracking).
 */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  return createServer({
    config,
    version: '0.1.0',
    registerRoutes: async (app) => {
      app.get('/api/leads/_status', async () => ({
        success: true,
        data: { service: SERVICE_NAME, scaffolded: true },
      }));
    },
  });
}
