import type { DataService } from '@kiana/db-kit';

export interface PipelineStageCount {
  stage: string;
  count: number;
}

export interface PipelineRepository {
  /** Total leads currently in the system. Used by /api/crm/_status. */
  countLeads(): Promise<number>;
  /**
   * Per-stage lead counts. Powers the kanban aggregation that lands in
   * Phase 1 task #21 (GET /api/crm/pipeline). Read straight from the
   * shared kiana DB via raw SQL so we don't pull lead-service's Drizzle
   * schema into crm-service. P4+ swaps this for an HTTP call to
   * lead-service per Project-Structure.md §11.
   */
  countLeadsByStage(): Promise<PipelineStageCount[]>;
}

/**
 * Build a raw-SQL-backed pipeline repository. Phase-1 lite reads directly
 * from leads on the shared cluster; deliberately doesn't import
 * services/lead-service Drizzle schemas to avoid cross-service compile-
 * time coupling. P4+ swaps this for `@kiana/service-client` calls.
 */
export function createPipelineRepository(data: DataService): PipelineRepository {
  return {
    async countLeads() {
      const result = await data.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM leads',
      );
      return Number(result.rows[0]?.count ?? 0);
    },
    async countLeadsByStage() {
      const result = await data.query<{ stage: string; count: string }>(
        'SELECT stage, COUNT(*)::text AS count FROM leads GROUP BY stage ORDER BY stage',
      );
      return result.rows.map((row) => ({ stage: row.stage, count: Number(row.count) }));
    },
  };
}
