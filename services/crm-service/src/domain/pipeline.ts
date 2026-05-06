import type {
  PipelineRepository,
  PipelineStageCount,
} from '../infra/pipelineRepository.js';

export interface PipelineDomainOptions {
  repository: PipelineRepository;
}

export interface PipelineSummary {
  total_leads: number;
  by_stage: PipelineStageCount[];
}

/**
 * crm-service domain. Phase-1 lite is read-only — composes pipeline views
 * from the leads table without owning any tables of its own. The kanban
 * aggregation endpoint (Phase 1 task #21) builds on getPipelineSummary().
 * Future: when CRM grows tasks / SLAs / follow-ups (Phase 2+), crm-service
 * gets its own tables under Project-Structure.md §6's crm_db.
 */
export class PipelineDomain {
  constructor(private readonly options: PipelineDomainOptions) {}

  /** One round-trip per call: total + per-stage in two queries. */
  async getPipelineSummary(): Promise<PipelineSummary> {
    const [total_leads, by_stage] = await Promise.all([
      this.options.repository.countLeads(),
      this.options.repository.countLeadsByStage(),
    ]);
    return { total_leads, by_stage };
  }
}
