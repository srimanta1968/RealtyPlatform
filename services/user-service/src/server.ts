import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerAuthRoutes } from './api/auth.js';
import { AuthDomain } from './domain/auth.js';
import { createUserRepository } from './infra/userRepository.js';
import { createNotificationDispatcher } from './infra/notificationDispatcher.js';
import { emailVerifications, users } from '../db/schema.js';

const SERVICE_NAME = 'user-service';
const DEFAULT_PORT = 4010;

export interface BuildServerOptions {
  bcryptRounds?: number;
}

/** Bootstrap the user-service Fastify instance with DataService + AuthDomain wired up. */
export async function buildServer(options: BuildServerOptions = {}): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService({ databaseUrl: config.databaseUrl }, { users, emailVerifications });
  const repository = createUserRepository(data.db);

  const notificationBaseUrl = process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4014';
  const serviceToken = process.env.SERVICE_TOKEN ?? 'dev-shared-secret';
  const publicBaseUrl = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000';
  const exposeVerificationToken =
    (process.env.EXPOSE_VERIFICATION_TOKEN ?? (config.nodeEnv === 'production' ? 'false' : 'true')) ===
    'true';

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
    },
    registerRoutes: async (server) => {
      const notifications = createNotificationDispatcher({
        baseUrl: notificationBaseUrl,
        serviceToken,
        logger: server.log,
      });
      const domain = new AuthDomain({
        repository,
        notifications,
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        bcryptRounds: options.bcryptRounds ?? Number(process.env.BCRYPT_ROUNDS ?? 10),
        publicBaseUrl,
        exposeVerificationToken,
      });
      await registerAuthRoutes(server, { domain });
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
