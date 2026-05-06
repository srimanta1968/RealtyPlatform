import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerAuthRoutes } from './api/auth.js';
import { AuthDomain } from './domain/auth.js';
import { createUserRepository } from './infra/userRepository.js';
import { users } from '../db/schema.js';

const SERVICE_NAME = 'user-service';
const DEFAULT_PORT = 4010;

export interface BuildServerOptions {
  bcryptRounds?: number;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService({ databaseUrl: config.databaseUrl }, { users });
  const repository = createUserRepository(data.db);
  const domain = new AuthDomain({
    repository,
    jwtSecret: config.jwtSecret,
    jwtExpiresIn: config.jwtExpiresIn,
    bcryptRounds: options.bcryptRounds ?? Number(process.env.BCRYPT_ROUNDS ?? 10),
  });

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
    },
    registerRoutes: async (server) => {
      await registerAuthRoutes(server, { domain });
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
