import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerInternalRoutes } from './api/internal.js';
import { EmailDomain } from './domain/email.js';
import { createNotificationRepository } from './infra/notificationRepository.js';
import { notificationSends, notificationTemplates } from '../db/schema.js';
import { NOTIFICATION_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'notification-service';
const DEFAULT_PORT = 4014;

/** Bootstrap notification-service with email-verification handler wired up. */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService(
    { databaseUrl: config.databaseUrl },
    { notificationSends, notificationTemplates },
  );
  const repository = createNotificationRepository(data.db);
  const serviceToken = process.env.SERVICE_TOKEN ?? 'dev-shared-secret';
  const logOnly = (process.env.NOTIFICATION_LOG_ONLY ?? 'true') === 'true';

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
      await data.query(NOTIFICATION_SERVICE_BOOTSTRAP_SQL);
    },
    registerRoutes: async (server) => {
      const emailDomain = new EmailDomain({ repository, logger: server.log, logOnly });
      await registerInternalRoutes(server, { emailDomain, serviceToken });

      server.get('/api/notifications/_status', async () => ({
        success: true,
        data: { service: SERVICE_NAME, scaffolded: false, logOnly },
      }));
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
