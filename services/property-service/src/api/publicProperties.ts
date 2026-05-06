// @governance-tracked — API definitions added: properties/list-get.json, properties/slug-get.json
import type { FastifyInstance } from 'fastify';

import { PropertyTypeSchema, type PropertyType } from '@kiana/contracts';

import {
  PropertyDomain,
  PropertyNotFoundError,
} from '../domain/properties.js';

export interface PublicPropertyRoutesOptions {
  domain: PropertyDomain;
}

interface ListQuery {
  type?: string;
  location?: string;
  price_min_minor?: string;
  price_max_minor?: string;
}

/**
 * Register the public-read property endpoints — list (with optional
 * lifestyle filters) + detail by slug. Both routes hard-pin
 * status='published' so unpublished drafts never leak. No auth — these
 * power the marketing site (web-public).
 */
export async function registerPublicPropertyRoutes(
  app: FastifyInstance,
  { domain }: PublicPropertyRoutesOptions,
): Promise<void> {
  app.get<{ Querystring: ListQuery }>('/api/properties', async (request, reply) => {
    try {
      const q = request.query;
      let type: PropertyType | undefined;
      if (q.type) {
        const parsed = PropertyTypeSchema.safeParse(q.type);
        if (!parsed.success) {
          return reply.code(400).send({
            success: false,
            error: 'Unsupported property type filter.',
            field: 'type',
          });
        }
        type = parsed.data;
      }
      const priceMinMinor = parseNonNegativeInt(q.price_min_minor);
      if (priceMinMinor === 'invalid') {
        return reply
          .code(400)
          .send({ success: false, error: 'price_min_minor must be a non-negative integer.', field: 'price_min_minor' });
      }
      const priceMaxMinor = parseNonNegativeInt(q.price_max_minor);
      if (priceMaxMinor === 'invalid') {
        return reply
          .code(400)
          .send({ success: false, error: 'price_max_minor must be a non-negative integer.', field: 'price_max_minor' });
      }

      const properties = await domain.list({
        status: 'published',
        ...(type !== undefined ? { type } : {}),
        ...(q.location ? { location: q.location } : {}),
        ...(priceMinMinor !== undefined ? { priceMinMinor } : {}),
        ...(priceMaxMinor !== undefined ? { priceMaxMinor } : {}),
      });
      return reply.code(200).send({ success: true, data: { properties } });
    } catch (err) {
      app.log.error({ err }, 'Public properties list failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { slug: string } }>('/api/properties/:slug', async (request, reply) => {
    try {
      const property = await domain.getBySlug(request.params.slug);
      // Hide non-published rows from the public detail surface — same
      // protection as the list filter, applied here at read time so a
      // direct slug lookup can't leak draft / hold rows.
      if (property.status !== 'published') {
        return reply.code(404).send({ success: false, error: `Property ${request.params.slug} not found.` });
      }
      return reply.code(200).send({ success: true, data: { property } });
    } catch (err) {
      if (err instanceof PropertyNotFoundError) {
        return reply.code(404).send({ success: false, error: err.message });
      }
      app.log.error({ err, slug: request.params.slug }, 'Public properties slug lookup failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}

function parseNonNegativeInt(raw: string | undefined): number | undefined | 'invalid' {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return 'invalid';
  }
  return value;
}
