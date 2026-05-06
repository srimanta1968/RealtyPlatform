import { createDataService } from '@kiana/db-kit';
import { createEventBus, type EventBus } from '@kiana/event-bus';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';
import type { LeadCreated, LeadStageChanged } from '@kiana/contracts';

import { registerInternalRoutes } from './api/internal.js';
import { registerTemplateRoutes } from './api/templates.js';
import { EmailDomain } from './domain/email.js';
import { LeadCreatedSubscriber } from './domain/leadEvents.js';
import { LeadStageChangedSubscriber } from './domain/leadStageEvents.js';
import { TemplateDomain } from './domain/templates.js';
import { createLeadLookupRepository } from './infra/leadLookupRepository.js';
import { createNotificationRepository } from './infra/notificationRepository.js';
import {
  startEventSubscription,
  type EventSubscriptionHandle,
} from './infra/eventSubscriptions.js';
import { createEmailProvider } from './transport/index.js';
import { notificationSends, notificationTemplates } from '../db/schema.js';
import { NOTIFICATION_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'notification-service';
const DEFAULT_PORT = 4014;
const DEFAULT_PRESALES_RECIPIENT = 'presales@kiana.local';
const DEFAULT_LEAD_URL_BASE = 'http://localhost:3001/admin/leads';
const LEAD_CREATED_CONSUMER_GROUP = 'notification-service.lead-created';
const LEAD_STAGE_CHANGED_CONSUMER_GROUP = 'notification-service.lead-stage-changed';

/** Bootstrap notification-service with email-verification handler wired up. */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService(
    { databaseUrl: config.databaseUrl },
    { notificationSends, notificationTemplates },
  );
  const repository = createNotificationRepository(data.db);
  const leadLookup = createLeadLookupRepository(data);
  const serviceToken = process.env.SERVICE_TOKEN ?? 'dev-shared-secret';
  const logOnly = (process.env.NOTIFICATION_LOG_ONLY ?? 'true') === 'true';
  const presalesRecipient =
    process.env.NOTIFICATION_PRESALES_RECIPIENT ?? DEFAULT_PRESALES_RECIPIENT;
  const leadDetailUrlBase = process.env.NOTIFICATION_LEAD_URL_BASE ?? DEFAULT_LEAD_URL_BASE;
  const eventBusUrl = process.env.EVENT_BUS_REDIS_URL;

  let bus: EventBus | null = null;
  const subscriptions: EventSubscriptionHandle[] = [];

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
      const emailProvider = createEmailProvider({
        provider: process.env.EMAIL_PROVIDER,
        logger: server.log,
        fromAddress: process.env.NOTIFICATION_FROM_ADDRESS,
        awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
        awsConfigurationSet: process.env.AWS_SES_CONFIGURATION_SET,
        sendgridApiKey: process.env.SENDGRID_API_KEY,
      });
      server.log.info({ provider: emailProvider.name }, 'email provider initialised');
      const leadCreatedSubscriber = new LeadCreatedSubscriber({
        repository,
        templateDomain,
        emailProvider,
        logger: server.log,
        presalesRecipient,
        leadDetailUrlBase,
      });
      const leadStageChangedSubscriber = new LeadStageChangedSubscriber({
        repository,
        templateDomain,
        leadLookup,
        emailProvider,
        logger: server.log,
      });

      await registerInternalRoutes(server, { emailDomain, serviceToken });
      await registerTemplateRoutes(server, { domain: templateDomain });

      if (eventBusUrl) {
        bus = createEventBus({ redisUrl: eventBusUrl });
        subscriptions.push(
          startEventSubscription<LeadCreated>({
            bus,
            eventType: 'lead.created',
            consumerGroup: LEAD_CREATED_CONSUMER_GROUP,
            handler: (event) => leadCreatedSubscriber.handle(event),
            logger: server.log,
          }),
          startEventSubscription<LeadStageChanged>({
            bus,
            eventType: 'lead.stage_changed',
            consumerGroup: LEAD_STAGE_CHANGED_CONSUMER_GROUP,
            handler: (event) => leadStageChangedSubscriber.handle(event),
            logger: server.log,
          }),
        );
        server.log.info(
          {
            consumerGroups: [LEAD_CREATED_CONSUMER_GROUP, LEAD_STAGE_CHANGED_CONSUMER_GROUP],
          },
          'event-bus subscriptions started',
        );
      } else {
        server.log.warn(
          'EVENT_BUS_REDIS_URL not set — lead.created / lead.stage_changed subscriptions are disabled (Phase-1 dev mode)',
        );
      }

      server.get('/api/notifications/_status', async () => ({
        success: true,
        data: {
          service: SERVICE_NAME,
          scaffolded: false,
          logOnly,
          emailProvider: emailProvider.name,
          subscriptions: {
            'lead.created': eventBusUrl ? 'enabled' : 'disabled',
            'lead.stage_changed': eventBusUrl ? 'enabled' : 'disabled',
          },
        },
      }));
    },
  });

  app.addHook('onClose', async () => {
    for (const sub of subscriptions) {
      await sub.stop();
    }
    if (bus) {
      await bus.close();
    }
    await data.close();
  });

  return app;
}
