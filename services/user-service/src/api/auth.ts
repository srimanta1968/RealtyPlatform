import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import type { AuthDomain } from '../domain/auth.js';
import { EmailTakenError } from '../domain/auth.js';

export interface AuthRoutesOptions {
  domain: AuthDomain;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  { domain }: AuthRoutesOptions,
): Promise<void> {
  app.post('/api/auth/register', async (request, reply) => {
    try {
      const result = await domain.register(request.body);
      return reply.code(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid registration payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      if (err instanceof EmailTakenError) {
        return reply.code(409).send({
          success: false,
          error: err.message,
          field: 'email',
        });
      }
      app.log.error({ err }, 'Registration failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
