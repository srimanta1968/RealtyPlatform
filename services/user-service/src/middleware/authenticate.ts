import '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * JWT preHandler. Validates the Bearer token attached to the request and lets
 * downstream handlers read `request.user`. Sends a 401 envelope on failure
 * (the @fastify/jwt default error shape would leak details).
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ success: false, error: 'Authentication required.' });
  }
}

/**
 * Read the verified JWT payload off the request. Should only be called inside
 * a route guarded by the `authenticate` preHandler.
 */
export interface SessionPayload {
  sub: string;
  email: string;
}

export function getSessionPayload(request: FastifyRequest): SessionPayload {
  const raw = request.user as Partial<SessionPayload> | undefined;
  if (!raw || typeof raw.sub !== 'string' || typeof raw.email !== 'string') {
    throw new Error('Session payload missing — authenticate preHandler did not run.');
  }
  return { sub: raw.sub, email: raw.email };
}
