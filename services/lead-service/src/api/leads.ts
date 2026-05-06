import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { BudgetRangeError, type LeadDomain } from '../domain/leads.js';

export interface LeadRoutesOptions {
  domain: LeadDomain;
}

/** Register lead-service public routes on the Fastify instance. */
export async function registerLeadRoutes(
  app: FastifyInstance,
  { domain }: LeadRoutesOptions,
): Promise<void> {
  app.post('/api/leads', async (request, reply) => {
    try {
      const lead = await domain.create(request.body);
      return reply.code(201).send({ success: true, data: { lead } });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid lead payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      if (err instanceof BudgetRangeError) {
        return reply.code(400).send({
          success: false,
          error: err.message,
          field: 'budget_min_minor',
        });
      }
      app.log.error({ err }, 'Lead creation failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get('/api/leads/sources', async (_request, reply) => {
    try {
      const data = await domain.listSources();
      return reply.code(200).send({ success: true, data });
    } catch (err) {
      app.log.error({ err }, 'Lead source listing failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });
}
