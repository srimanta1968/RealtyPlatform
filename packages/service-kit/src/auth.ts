import '@fastify/jwt';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

/**
 * Verified-JWT claims every authenticated request carries. `sub` is the
 * user id, `email` is denormalised so callers can render personalised
 * responses without a DB hop, and `role` drives RBAC decisions in
 * requireRole(). The role claim is added when user-service signs the
 * JWT — older tokens issued before Phase-1-Trust-Launch.md §3 are
 * treated as 'customer' (least-privileged) by getSessionClaims().
 */
export interface SessionClaims {
  sub: string;
  email: string;
  role: string;
}

/**
 * JWT-decoding preHandler. Validates the Bearer token, populates
 * request.user with the verified claims, and 401s with an envelope-
 * shaped body on failure (the @fastify/jwt default error shape leaks
 * details). Pair with requireRole() when a route needs RBAC on top of
 * authentication.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ success: false, error: 'Authentication required.' });
  }
}

/**
 * Read the verified JWT claims off the request. Should only be called
 * inside a route guarded by `authenticate` or `requireRole`. Throws if
 * the preHandler did not run — better to crash loudly than to read
 * undefined claims and silently misroute.
 *
 * Tokens issued before role-claim support shipped (Phase-1 backfill)
 * default to 'customer' so the helper never returns an undefined role.
 */
export function getSessionClaims(request: FastifyRequest): SessionClaims {
  const raw = request.user as Partial<SessionClaims> | undefined;
  if (!raw || typeof raw.sub !== 'string' || typeof raw.email !== 'string') {
    throw new Error('Session claims missing — authenticate / requireRole preHandler did not run.');
  }
  return {
    sub: raw.sub,
    email: raw.email,
    role: typeof raw.role === 'string' && raw.role.length > 0 ? raw.role : 'customer',
  };
}

/**
 * Build a Fastify preHandler that decodes the JWT, reads the `role`
 * claim, and rejects requests whose role is not in the allowed set.
 * Composes with the standard route-options shape:
 *
 *     fastify.route({
 *       method: 'POST', url: '/api/users/invite',
 *       preHandler: requireRole('admin'),
 *       handler: ...
 *     });
 *
 * Pass multiple roles when several are equally allowed:
 *
 *     requireRole('admin', 'presales')
 *
 * The handler 401s on missing / invalid tokens (same semantic as
 * authenticate) and 403s when the role is not a member. Throws at build
 * time when no roles are supplied — that's a coding error, not a
 * runtime concern.
 */
export function requireRole(...allowed: string[]): preHandlerHookHandler {
  if (allowed.length === 0) {
    throw new Error('requireRole(): supply at least one role.');
  }
  const allowedSet = new Set(allowed);

  return async function requireRolePreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, error: 'Authentication required.' });
      return;
    }
    const raw = request.user as Partial<SessionClaims> | undefined;
    const role = raw && typeof raw.role === 'string' ? raw.role : null;
    if (!role || !allowedSet.has(role)) {
      reply.code(403).send({ success: false, error: 'Permission denied.' });
    }
  };
}
