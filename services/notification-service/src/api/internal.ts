import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import type { EmailDomain } from '../domain/email.js';

export interface InternalRoutesOptions {
  emailDomain: EmailDomain;
  /** Shared secret expected on the `x-service-token` header from internal callers. */
  serviceToken: string;
}

/** Register internal-only notification routes (not exposed by the BFF). */
export async function registerInternalRoutes(
  app: FastifyInstance,
  { emailDomain, serviceToken }: InternalRoutesOptions,
): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/internal/')) {
      return;
    }
    const provided = request.headers['x-service-token'];
    if (provided !== serviceToken) {
      reply.code(401).send({ success: false, error: 'Service token required' });
    }
  });

  app.post('/internal/notifications/email-verification', async (request, reply) => {
    try {
      const result = await emailDomain.sendEmailVerification(request.body);
      return reply.code(202).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid notification payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      app.log.error({ err }, 'Failed to send email verification');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
