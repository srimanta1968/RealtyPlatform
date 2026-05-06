import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerPropertyAdminRoutes } from './api/properties.js';
import { registerPublicPropertyRoutes } from './api/publicProperties.js';
import { PropertyDomain } from './domain/properties.js';
import { createPropertyRepository } from './infra/propertyRepository.js';
import { properties } from '../db/schema.js';
import { PROPERTY_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'property-service';
const DEFAULT_PORT = 4012;

/**
 * Bootstrap property-service per Phase-1-Trust-Launch.md §4.2 +
 * Project-Structure.md §6. Owns property_db with a single table for
 * Phase 1; admin CRUD + publish workflow + public list/detail endpoints
 * are registered by subsequent Phase 1 tasks.
 */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService({ databaseUrl: config.databaseUrl }, { properties });
  const repository = createPropertyRepository(data.db);

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
      await data.query(PROPERTY_SERVICE_BOOTSTRAP_SQL);
    },
    registerRoutes: async (server) => {
      const domain = new PropertyDomain({ repository });
      await registerPropertyAdminRoutes(server, { domain });
      await registerPublicPropertyRoutes(server, { domain });
      server.get('/api/properties/_status', async () => ({
        success: true,
        data: {
          service: SERVICE_NAME,
          ready: true,
          domain_constructed: domain instanceof PropertyDomain,
        },
      }));
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
