// @governance-tracked — API definitions added: properties/create-post.json, properties/id-patch.json
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { requireRole } from '@kiana/service-kit';

import {
  PriceRangeError,
  PropertyDomain,
  PropertyNotFoundError,
  PropertySlugTakenError,
} from '../domain/properties.js';

export interface PropertyRoutesOptions {
  domain: PropertyDomain;
}

/**
 * Register admin-only property CRUD routes — create + partial update.
 * Both routes are gated by requireRole('admin'); the publish workflow
 * (PATCH /:id/publish) and public list / detail endpoints land in
 * Phase 1 Tasks #16 and #17 respectively.
 */
export async function registerPropertyAdminRoutes(
  app: FastifyInstance,
  { domain }: PropertyRoutesOptions,
): Promise<void> {
  app.post(
    '/api/properties',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      try {
        const property = await domain.create(request.body);
        return reply.code(201).send({ success: true, data: { property } });
      } catch (err) {
        if (err instanceof ZodError) {
          const first = err.issues[0];
          return reply.code(400).send({
            success: false,
            error: first?.message ?? 'Invalid property payload.',
            field: first?.path.join('.') || undefined,
          });
        }
        if (err instanceof PropertySlugTakenError) {
          return reply.code(409).send({ success: false, error: err.message });
        }
        if (err instanceof PriceRangeError) {
          return reply.code(400).send({ success: false, error: err.message });
        }
        app.log.error({ err }, 'Property create failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/properties/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      try {
        const property = await domain.updateFromRequest(request.params.id, request.body);
        return reply.code(200).send({ success: true, data: { property } });
      } catch (err) {
        if (err instanceof ZodError) {
          const first = err.issues[0];
          return reply.code(400).send({
            success: false,
            error: first?.message ?? 'Invalid property payload.',
            field: first?.path.join('.') || undefined,
          });
        }
        if (err instanceof PropertyNotFoundError) {
          return reply.code(404).send({ success: false, error: err.message });
        }
        if (err instanceof PriceRangeError) {
          return reply.code(400).send({ success: false, error: err.message });
        }
        app.log.error({ err, id: request.params.id }, 'Property update failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );
}
