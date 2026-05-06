import type { FastifyInstance } from 'fastify';

import type { LeadDomain } from '../domain/leads.js';
import {
  WorkflowNotFoundError,
  composeWorkflowMetrics,
  getWorkflowBySlug,
  listWorkflowSummaries,
} from '../domain/workflows.js';

export interface WorkflowRoutesOptions {
  /**
   * Lead domain — used by the metrics endpoint to source raw per-stage
   * counts. The catalog routes themselves are read-only over a static
   * @kiana/contracts catalog and don't need it.
   */
  leadDomain?: LeadDomain;
}

/** Register the workflow catalog read endpoints on the lead-service Fastify instance. */
export async function registerWorkflowRoutes(
  app: FastifyInstance,
  options: WorkflowRoutesOptions = {},
): Promise<void> {
  app.get('/api/workflows', async (_request, reply) => {
    try {
      const workflows = listWorkflowSummaries();
      return reply.code(200).send({ success: true, data: { workflows } });
    } catch (err) {
      app.log.error({ err }, 'Workflow catalog listing failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { slug: string } }>('/api/workflows/:slug', async (request, reply) => {
    try {
      const workflow = getWorkflowBySlug(request.params.slug);
      return reply.code(200).send({ success: true, data: { workflow } });
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) {
        return reply.code(404).send({ success: false, error: err.message });
      }
      app.log.error({ err }, 'Workflow detail lookup failed');
      return reply.code(500).send({ success: false, error: 'Internal Server Error' });
    }
  });

  app.get<{ Params: { slug: string } }>(
    '/api/workflows/:slug/metrics',
    async (request, reply) => {
      try {
        const workflow = getWorkflowBySlug(request.params.slug);
        if (!options.leadDomain) {
          throw new Error('Workflow metrics require leadDomain to be wired in.');
        }
        const stageCounts = await options.leadDomain.countByStage();
        const metrics = composeWorkflowMetrics(workflow, stageCounts);
        return reply.code(200).send({ success: true, data: { metrics } });
      } catch (err) {
        if (err instanceof WorkflowNotFoundError) {
          return reply.code(404).send({ success: false, error: err.message });
        }
        app.log.error({ err }, 'Workflow metrics lookup failed');
        return reply.code(500).send({ success: false, error: 'Internal Server Error' });
      }
    },
  );
}
