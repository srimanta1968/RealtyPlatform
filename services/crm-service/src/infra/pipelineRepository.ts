import type { DataService } from '@kiana/db-kit';

export interface PipelineStageCount {
  stage: string;
  count: number;
}

export interface PipelineLeadCard {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  owner_id: string | null;
  updated_at: string;
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
  /**
   * Most-recent N leads per stage, used to render the kanban cards. The
   * window is enforced via window-function ROW_NUMBER OVER (PARTITION
   * BY stage ORDER BY updated_at DESC) so the grand total stays small
   * even when one stage has thousands of leads.
   */
  listLeadsByStage(perStageLimit: number, ownerId?: string): Promise<PipelineLeadCard[]>;
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

    async listLeadsByStage(perStageLimit, ownerId) {
      const limit = Math.max(1, Math.min(perStageLimit, 200));
      const ownerFilter = ownerId ? 'WHERE owner_id = $2' : '';
      const params: unknown[] = [limit];
      if (ownerId) params.push(ownerId);
      const sql = `
        WITH ranked AS (
          SELECT
            id, full_name, email, phone, stage, source, owner_id, updated_at,
            ROW_NUMBER() OVER (PARTITION BY stage ORDER BY updated_at DESC) AS rn
          FROM leads
          ${ownerFilter}
        )
        SELECT id, full_name, email, phone, stage, source, owner_id, updated_at
        FROM ranked
        WHERE rn <= $1
        ORDER BY stage, updated_at DESC
      `;
      const result = await data.query<{
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        stage: string;
        source: string;
        owner_id: string | null;
        updated_at: Date;
      }>(sql, params);
      return result.rows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        stage: row.stage,
        source: row.source,
        owner_id: row.owner_id,
        updated_at: row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
      }));
    },
  };
}
