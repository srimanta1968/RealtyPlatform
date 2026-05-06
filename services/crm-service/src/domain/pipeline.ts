import type {
  PipelineLeadCard,
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

export interface PipelineColumn {
  stage: string;
  count: number;
  cards: PipelineLeadCard[];
}

export interface PipelineKanban {
  total_leads: number;
  columns: PipelineColumn[];
}

const DEFAULT_PER_STAGE_LIMIT = 25;

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

  /**
   * Aggregated kanban view: one column per LeadStage, each carrying the
   * stage count plus the most-recent N cards (ordered by updated_at).
   * Optional ownerId filter narrows the view to a single presales user
   * — powers the admin-cockpit's "My pipeline" toggle.
   */
  async getKanban(options: {
    perStageLimit?: number;
    ownerId?: string;
  } = {}): Promise<PipelineKanban> {
    const limit = options.perStageLimit ?? DEFAULT_PER_STAGE_LIMIT;
    const [counts, cards] = await Promise.all([
      this.options.repository.countLeadsByStage(),
      this.options.repository.listLeadsByStage(limit, options.ownerId),
    ]);
    const cardsByStage = new Map<string, PipelineLeadCard[]>();
    for (const card of cards) {
      const bucket = cardsByStage.get(card.stage);
      if (bucket) bucket.push(card);
      else cardsByStage.set(card.stage, [card]);
    }
    const stages = new Set<string>([
      ...counts.map((c) => c.stage),
      ...cardsByStage.keys(),
    ]);
    const columns: PipelineColumn[] = Array.from(stages)
      .sort()
      .map((stage) => ({
        stage,
        count: counts.find((c) => c.stage === stage)?.count ?? 0,
        cards: cardsByStage.get(stage) ?? [],
      }));
    const total_leads = counts.reduce((acc, c) => acc + c.count, 0);
    return { total_leads, columns };
  }
}
