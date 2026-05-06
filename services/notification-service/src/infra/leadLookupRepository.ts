import type { DataService } from '@kiana/db-kit';

type AnyDataService = DataService<Record<string, unknown>>;

/**
 * Minimal read view of a lead — full_name + email — used by the
 * stage-changed subscriber to render the customer email. Phase-1 reads
 * directly from the shared `leads` table via raw SQL (same expedient
 * crm-service's pipelineRepository uses) so notification-service does
 * not pull lead-service's Drizzle schema in. P4+ swaps for an HTTP call
 * to lead-service per Project-Structure.md §11.
 */
export interface LeadLookup {
  full_name: string;
  email: string | null;
}

export interface LeadLookupRepository {
  findById(leadId: string): Promise<LeadLookup | null>;
}

export function createLeadLookupRepository(data: AnyDataService): LeadLookupRepository {
  return {
    async findById(leadId) {
      const result = await data.query<{ full_name: string; email: string | null }>(
        'SELECT full_name, email FROM leads WHERE id = $1 LIMIT 1',
        [leadId],
      );
      return result.rows[0] ?? null;
    },
  };
}
