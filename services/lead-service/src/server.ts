import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerLeadRoutes } from './api/leads.js';
import { registerWorkflowRoutes } from './api/workflows.js';
import { LeadDomain } from './domain/leads.js';
import { createLeadRepository } from './infra/leadRepository.js';
import { leads } from '../db/schema.js';

const SERVICE_NAME = 'lead-service';
const DEFAULT_PORT = 4011;

/**
 * Bootstrap the lead-service Fastify instance with DataService + LeadDomain
 * + the static workflow catalog wired up. Registers the lead routes that
 * Tasks 5–8 built (capture / sources / list / detail / status update) and
 * the workflow read routes added in Task 9.
 */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService({ databaseUrl: config.databaseUrl }, { leads });
  const repository = createLeadRepository(data.db);

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
    },
    registerRoutes: async (server) => {
      const domain = new LeadDomain({ repository });
      await registerLeadRoutes(server, { domain });
      await registerWorkflowRoutes(server);
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
