import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerInternalRoutes } from './api/internal.js';
import { registerTemplateRoutes } from './api/templates.js';
import { EmailDomain } from './domain/email.js';
import { LeadCreatedSubscriber } from './domain/leadEvents.js';
import { TemplateDomain } from './domain/templates.js';
import { createNotificationRepository } from './infra/notificationRepository.js';
import {
  startLeadCreatedSubscription,
  type LeadCreatedSubscriptionHandle,
} from './infra/eventSubscriptions.js';
import { notificationSends, notificationTemplates } from '../db/schema.js';
import { NOTIFICATION_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'notification-service';
const DEFAULT_PORT = 4014;
const DEFAULT_PRESALES_RECIPIENT = 'presales@kiana.local';
const DEFAULT_LEAD_URL_BASE = 'http://localhost:3001/admin/leads';
const LEAD_CREATED_CONSUMER_GROUP = 'notification-service.lead-created';

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
  const presalesRecipient =
    process.env.NOTIFICATION_PRESALES_RECIPIENT ?? DEFAULT_PRESALES_RECIPIENT;
  const leadDetailUrlBase = process.env.NOTIFICATION_LEAD_URL_BASE ?? DEFAULT_LEAD_URL_BASE;
  const eventBusUrl = process.env.EVENT_BUS_REDIS_URL;

  let leadCreatedSubscription: LeadCreatedSubscriptionHandle | null = null;

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
      await data.query(NOTIFICATION_SERVICE_BOOTSTRAP_SQL);
    },
    registerRoutes: async (server) => {
      const emailDomain = new EmailDomain({ repository, logger: server.log, logOnly });
      const templateDomain = new TemplateDomain({ repository });
      const leadCreatedSubscriber = new LeadCreatedSubscriber({
        repository,
        templateDomain,
        logger: server.log,
        presalesRecipient,
        leadDetailUrlBase,
        logOnly,
      });

      await registerInternalRoutes(server, { emailDomain, serviceToken });
      await registerTemplateRoutes(server, { domain: templateDomain });

      if (eventBusUrl) {
        leadCreatedSubscription = startLeadCreatedSubscription({
          redisUrl: eventBusUrl,
          consumerGroup: LEAD_CREATED_CONSUMER_GROUP,
          subscriber: leadCreatedSubscriber,
          logger: server.log,
        });
        server.log.info(
          { consumerGroup: LEAD_CREATED_CONSUMER_GROUP },
          'lead.created subscription started',
        );
      } else {
        server.log.warn(
          'EVENT_BUS_REDIS_URL not set — lead.created subscription is disabled (Phase-1 dev mode)',
        );
      }

      server.get('/api/notifications/_status', async () => ({
        success: true,
        data: {
          service: SERVICE_NAME,
          scaffolded: false,
          logOnly,
          subscriptions: {
            'lead.created': eventBusUrl ? 'enabled' : 'disabled',
          },
        },
      }));
    },
  });

  app.addHook('onClose', async () => {
    if (leadCreatedSubscription) {
      await leadCreatedSubscription.stop();
    }
    await data.close();
  });

  return app;
}
