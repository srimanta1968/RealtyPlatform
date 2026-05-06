import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { TemplateDomain, TemplateNotFoundError } from '../domain/templates.js';

export interface TemplateRoutesOptions {
  domain: TemplateDomain;
}

/**
 * Public-ish notification-template admin routes. Mounted under /api/...
 * (visible through web-bff) so operators can tune templates from the
 * admin cockpit. Admin-only enforcement lands when the requireRole
 * middleware ships in Phase 1 Task #11.
 */
export async function registerTemplateRoutes(
  app: FastifyInstance,
  { domain }: TemplateRoutesOptions,
): Promise<void> {
  app.post('/api/notifications/templates', async (request, reply) => {
    try {
      const template = await domain.upsert(request.body);
      return reply.code(200).send({ success: true, data: { template } });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid template payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      app.log.error({ err }, 'Notification template upsert failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get('/api/notifications/templates', async (_request, reply) => {
    try {
      const templates = await domain.list();
      return reply.code(200).send({ success: true, data: { templates } });
    } catch (err) {
      app.log.error({ err }, 'Notification template list failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { slug: string } }>(
    '/api/notifications/templates/:slug',
    async (request, reply) => {
      try {
        const template = await domain.getBySlug(request.params.slug);
        return reply.code(200).send({ success: true, data: { template } });
      } catch (err) {
        if (err instanceof TemplateNotFoundError) {
          return reply.code(404).send({ success: false, error: err.message });
        }
        app.log.error({ err }, 'Notification template lookup failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );
}
