import type { FastifyInstance } from 'fastify';

import {
  WorkflowNotFoundError,
  getWorkflowBySlug,
  listWorkflowSummaries,
} from '../domain/workflows.js';

/** Register the workflow catalog read endpoints on the lead-service Fastify instance. */
export async function registerWorkflowRoutes(app: FastifyInstance): Promise<void> {
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
}
