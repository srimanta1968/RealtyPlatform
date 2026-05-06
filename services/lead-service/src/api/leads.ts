import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import {
  BudgetRangeError,
  LeadNotFoundError,
  WorkflowAtFinalStepError,
  WorkflowAtTerminalError,
  WorkflowNotRegisteredError,
  type LeadDomain,
} from '../domain/leads.js';

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

  app.get<{ Querystring: { days?: string; workflow?: string } }>(
    '/api/leads/stale',
    async (request, reply) => {
      try {
        const days = request.query.days ? Number(request.query.days) : undefined;
        if (days !== undefined && (Number.isNaN(days) || days <= 0)) {
          return reply.code(400).send({
            success: false,
            error: 'days must be a positive integer.',
            field: 'days',
          });
        }
        const data = await domain.listStaleLeads(days, request.query.workflow);
        return reply.code(200).send({ success: true, data });
      } catch (err) {
        if (err instanceof WorkflowNotRegisteredError) {
          return reply.code(400).send({ success: false, error: err.message, field: 'workflow' });
        }
        app.log.error({ err }, 'Stale leads listing failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  app.get('/api/leads', async (_request, reply) => {
    try {
      const leads = await domain.list();
      return reply.code(200).send({ success: true, data: { leads } });
    } catch (err) {
      app.log.error({ err }, 'Lead listing failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
    try {
      const lead = await domain.getById(request.params.id);
      return reply.code(200).send({ success: true, data: { lead } });
    } catch (err) {
      if (err instanceof LeadNotFoundError) {
        return reply.code(404).send({ success: false, error: err.message });
      }
      app.log.error({ err }, 'Lead detail lookup failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.patch<{ Params: { id: string } }>('/api/leads/:id', async (request, reply) => {
    try {
      const lead = await domain.updateLead(request.params.id, request.body);
      return reply.code(200).send({ success: true, data: { lead } });
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return reply.code(400).send({
          success: false,
          error: first?.message ?? 'Invalid lead update payload.',
          field: first?.path.join('.') || undefined,
        });
      }
      if (err instanceof LeadNotFoundError) {
        return reply.code(404).send({ success: false, error: err.message });
      }
      app.log.error({ err }, 'Lead update failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { id: string }; Querystring: { workflow?: string } }>(
    '/api/leads/:id/execution',
    async (request, reply) => {
      try {
        const result = await domain.getWorkflowExecution(
          request.params.id,
          request.query.workflow,
        );
        return reply.code(200).send({ success: true, data: result });
      } catch (err) {
        if (err instanceof LeadNotFoundError) {
          return reply.code(404).send({ success: false, error: err.message });
        }
        if (err instanceof WorkflowNotRegisteredError) {
          return reply.code(400).send({ success: false, error: err.message, field: 'workflow' });
        }
        app.log.error({ err }, 'Workflow execution lookup failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );

  app.post<{ Params: { id: string }; Querystring: { workflow?: string } }>(
    '/api/leads/:id/advance',
    async (request, reply) => {
      try {
        const result = await domain.advanceWorkflow(request.params.id, request.query.workflow);
        return reply.code(200).send({ success: true, data: result });
      } catch (err) {
        if (err instanceof LeadNotFoundError) {
          return reply.code(404).send({ success: false, error: err.message });
        }
        if (err instanceof WorkflowNotRegisteredError) {
          return reply.code(400).send({ success: false, error: err.message, field: 'workflow' });
        }
        if (err instanceof WorkflowAtTerminalError || err instanceof WorkflowAtFinalStepError) {
          return reply.code(409).send({ success: false, error: err.message });
        }
        app.log.error({ err }, 'Workflow advance failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );
}
