import { createDataService } from '@kiana/db-kit';
import { createServer, loadServiceConfig, type KianaFastify } from '@kiana/service-kit';

import { PipelineDomain } from './domain/pipeline.js';
import { createPipelineRepository } from './infra/pipelineRepository.js';
import { CRM_SERVICE_BOOTSTRAP_SQL } from '../db/bootstrap.js';

const SERVICE_NAME = 'crm-service';
const DEFAULT_PORT = 4013;

/**
 * Bootstrap crm-service per Phase-1-Trust-Launch.md §4 + Project-Structure.md
 * §6. Phase-1 lite: no own tables, reads from leads on the shared kiana DB.
 * The kanban aggregation endpoint (GET /api/crm/pipeline) lands in Phase 1
 * task #21; this commit just stands the service up + wires the readiness
 * probe so operators can confirm connectivity.
 */
export async function buildServer(): Promise<KianaFastify> {
  const config = loadServiceConfig({ service: SERVICE_NAME, defaultPort: DEFAULT_PORT });
  const data = createDataService({ databaseUrl: config.databaseUrl });
  const repository = createPipelineRepository(data);

  const app = await createServer({
    config,
    version: '0.1.0',
    ready: async () => {
      await data.ping();
      await data.query(CRM_SERVICE_BOOTSTRAP_SQL);
    },
    registerRoutes: async (server) => {
      const domain = new PipelineDomain({ repository });
      server.get('/api/crm/_status', async () => {
        const summary = await domain.getPipelineSummary();
        return {
          success: true,
          data: {
            service: SERVICE_NAME,
            ready: true,
            lead_count: summary.total_leads,
          },
        };
      });

      server.get<{ Querystring: { owner_id?: string; per_stage_limit?: string } }>(
        '/api/crm/pipeline',
        async (request, reply) => {
          try {
            const ownerId = request.query.owner_id;
            const limitRaw = request.query.per_stage_limit;
            const perStageLimit =
              limitRaw === undefined ? undefined : Number(limitRaw);
            if (
              perStageLimit !== undefined &&
              (!Number.isInteger(perStageLimit) || perStageLimit < 1)
            ) {
              return reply.code(400).send({
                success: false,
                error: 'per_stage_limit must be a positive integer.',
                field: 'per_stage_limit',
              });
            }
            const kanban = await domain.getKanban({
              ...(ownerId ? { ownerId } : {}),
              ...(perStageLimit !== undefined ? { perStageLimit } : {}),
            });
            return reply.code(200).send({ success: true, data: kanban });
          } catch (err) {
            server.log.error({ err }, 'CRM pipeline read failed');
            return reply.code(500).send({ success: false, error: 'Internal Server Error' });
          }
        },
      );
    },
  });

  app.addHook('onClose', async () => {
    await data.close();
  });

  return app;
}
