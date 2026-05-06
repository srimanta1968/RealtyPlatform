import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import {
  AlreadyVerifiedError,
  EmailTakenError,
  InvalidCredentialsError,
  InvalidVerificationTokenError,
  UserNotFoundError,
  type AuthDomain,
} from '../domain/auth.js';
import { authenticate, getSessionPayload } from '../middleware/authenticate.js';

export interface AuthRoutesOptions {
  domain: AuthDomain;
}

function zodErrorReply(err: ZodError, fallback: string): { status: number; body: unknown } {
  const first = err.issues[0];
  return {
    status: 400,
    body: {
      success: false,
      error: first?.message ?? fallback,
      field: first?.path.join('.') || undefined,
    },
  };
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
        const { status, body } = zodErrorReply(err, 'Invalid registration payload.');
        return reply.code(status).send(body);
      }
      if (err instanceof EmailTakenError) {
        return reply.code(409).send({ success: false, error: err.message, field: 'email' });
      }
      app.log.error({ err }, 'Registration failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    try {
      const result = await domain.login(request.body);
      return reply.code(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const { status, body } = zodErrorReply(err, 'Invalid login payload.');
        return reply.code(status).send(body);
      }
      if (err instanceof InvalidCredentialsError) {
        return reply.code(401).send({ success: false, error: err.message });
      }
      app.log.error({ err }, 'Login failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.post('/api/auth/verify-email', async (request, reply) => {
    try {
      const result = await domain.verifyEmail(request.body);
      return reply.code(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const { status, body } = zodErrorReply(err, 'Invalid verification payload.');
        return reply.code(status).send(body);
      }
      if (err instanceof InvalidVerificationTokenError) {
        return reply.code(400).send({ success: false, error: err.message, field: 'token' });
      }
      app.log.error({ err }, 'Email verification failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const payload = getSessionPayload(request);
      const user = await domain.getById(payload.sub);
      if (!user) {
        return reply.code(401).send({ success: false, error: 'Session no longer valid.' });
      }
      return reply.code(200).send({ success: true, data: { user } });
    } catch (err) {
      app.log.error({ err }, 'Session lookup failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.post('/api/auth/logout', { preHandler: authenticate }, async (_request, reply) => {
    // Stateless JWT: nothing to invalidate server-side in Phase 1. The client
    // discards the token. A token-revocation list lands when sessions move
    // server-side (Phase 2 — see services/user-service/openapi.yaml).
    return reply.code(200).send({
      success: true,
      data: { logged_out_at: new Date().toISOString() },
    });
  });

  app.post('/api/auth/resend-verification', async (request, reply) => {
    try {
      const result = await domain.resendVerification(request.body);
      return reply.code(200).send({ success: true, data: result });
    } catch (err) {
      if (err instanceof ZodError) {
        const { status, body } = zodErrorReply(err, 'Invalid resend-verification payload.');
        return reply.code(status).send(body);
      }
      if (err instanceof UserNotFoundError) {
        // Surface as 200 to avoid leaking which emails are registered.
        return reply.code(200).send({
          success: true,
          data: { verification: { expires_at: new Date().toISOString() } },
        });
      }
      if (err instanceof AlreadyVerifiedError) {
        return reply.code(409).send({ success: false, error: err.message, field: 'email' });
      }
      app.log.error({ err }, 'Resend verification failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
