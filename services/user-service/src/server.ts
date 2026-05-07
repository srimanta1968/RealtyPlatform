import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { registerAuthRoutes } from './api/auth.js';
import { registerInviteRoutes } from './api/invites.js';
import { AuthDomain } from './domain/auth.js';
import { InviteDomain } from './domain/invites.js';
import { createUserRepository } from './infra/userRepository.js';
import { createStaffInviteRepository } from './infra/staffInviteRepository.js';
import { createNotificationDispatcher } from './infra/notificationDispatcher.js';
import { emailVerifications, staffInvites, users } from '../db/schema.js';
import { USER_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'user-service';
const DEFAULT_PORT = 4010;

export interface BuildServerOptions {
  bcryptRounds?: number;
}

/** Bootstrap the user-service Fastify instance with DataService + AuthDomain wired up. */
export async function buildServer(options: BuildServerOptions = {}): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService(
    { databaseUrl: config.databaseUrl },
    { users, emailVerifications, staffInvites },
  );
  const repository = createUserRepository(data.db);
  const invitesRepository = createStaffInviteRepository(data.db);

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
      await data.query(USER_SERVICE_BOOTSTRAP_SQL);
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
      const inviteDomain = new InviteDomain({
        invites: invitesRepository,
        users: repository,
        notifications,
        authDomain: domain,
        jwtSecret: config.jwtSecret,
        jwtExpiresIn: config.jwtExpiresIn,
        bcryptRounds: options.bcryptRounds ?? Number(process.env.BCRYPT_ROUNDS ?? 10),
        publicBaseUrl,
        exposeInviteToken: exposeVerificationToken,
      });
      await registerAuthRoutes(server, { domain });
      await registerInviteRoutes(server, { domain: inviteDomain });

      // 404-fallback proxy → web-bff. The projexlight test runner pins
      // localServerPort to user-service (4010) and hits every Phase-1
      // route there; in dev that means we forward anything user-service
      // doesn't own to the BFF, which then routes to the right service.
      // No-op in production: WEB_BFF_URL is unset, registerNotFound is
      // skipped, and the default Fastify 404 handler kicks in.
      const webBffUrl = process.env.WEB_BFF_URL;
      if (webBffUrl) {
        server.setNotFoundHandler(async (request, reply) => {
          if (!request.url.startsWith('/api/')) {
            return reply.code(404).send({ success: false, error: 'Not Found' });
          }
          try {
            const target = `${webBffUrl.replace(/\/+$/, '')}${request.url}`;
            const headers: Record<string, string> = {};
            for (const [k, v] of Object.entries(request.headers)) {
              if (typeof v === 'string') headers[k] = v;
            }
            // Strip hop-by-hop + the Fastify-set host so undici picks the
            // upstream host. Host mismatch breaks fastify's host check.
            delete headers.host;
            delete headers['content-length'];
            const init: RequestInit = {
              method: request.method,
              headers,
            };
            if (request.method !== 'GET' && request.method !== 'HEAD') {
              init.body =
                request.body == null
                  ? undefined
                  : typeof request.body === 'string'
                    ? request.body
                    : JSON.stringify(request.body);
              if (init.body && !headers['content-type']) {
                headers['content-type'] = 'application/json';
              }
            }
            const upstream = await fetch(target, init);
            const text = await upstream.text();
            reply.status(upstream.status);
            const ct = upstream.headers.get('content-type');
            if (ct) reply.header('content-type', ct);
            return reply.send(text);
          } catch (err) {
            server.log.error({ err, url: request.url }, '[user-service 404→bff] proxy failed');
            return reply.code(502).send({ success: false, error: 'Upstream BFF unreachable' });
          }
        });
      }
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
