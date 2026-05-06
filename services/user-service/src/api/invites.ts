// @governance-tracked — API definitions added: users/invite-post.json, users/accept-invite-post.json
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { authenticate, getSessionClaims, requireRole } from '@kiana/service-kit';

import { InviteDomain, InviteNotFoundError } from '../domain/invites.js';
import { EmailTakenError } from '../domain/auth.js';

export interface InviteRoutesOptions {
  domain: InviteDomain;
}

/**
 * Register the staff invite + accept routes. Issue is admin-gated;
 * accept is public (the token IS the auth) so freshly-invited users
 * can finish onboarding without a pre-existing session.
 */
export async function registerInviteRoutes(
  app: FastifyInstance,
  { domain }: InviteRoutesOptions,
): Promise<void> {
  app.post(
    '/api/users/invite',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      try {
        const session = getSessionClaims(request);
        const result = await domain.issue(request.body, session.sub);
        return reply.code(201).send({ success: true, data: result });
      } catch (err) {
        if (err instanceof ZodError) {
          const first = err.issues[0];
          return reply.code(400).send({
            success: false,
            error: first?.message ?? 'Invalid invite payload.',
            field: first?.path.join('.') || undefined,
          });
        }
        if (err instanceof EmailTakenError) {
          return reply.code(409).send({ success: false, error: err.message });
        }
        app.log.error({ err }, 'Staff invite issue failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  app.post('/api/users/accept-invite', async (request, reply) => {
    try {
      const result = await domain.accept(request.body);
      return reply.code(201).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid accept payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      if (err instanceof InviteNotFoundError) {
        return reply.code(400).send({ success: false, error: err.message, field: 'token' });
      }
      if (err instanceof EmailTakenError) {
        return reply.code(409).send({ success: false, error: err.message });
      }
      app.log.error({ err }, 'Staff invite accept failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
