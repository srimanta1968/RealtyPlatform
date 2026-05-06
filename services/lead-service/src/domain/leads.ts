import {
  LeadCreateRequestSchema,
  LeadSourceSchema,
  type LeadRecord,
  type LeadSourceSummary,
} from '@kiana/contracts';

import type { LeadRepository } from '../infra/leadRepository.js';

export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead ${id} not found.`);
    this.name = 'LeadNotFoundError';
  }
}

export class BudgetRangeError extends Error {
  constructor() {
    super('budget_min_minor cannot exceed budget_max_minor.');
    this.name = 'BudgetRangeError';
  }
}

export interface LeadDomainOptions {
  repository: LeadRepository;
}

export class LeadDomain {
  constructor(private readonly options: LeadDomainOptions) {}

  /**
   * Validate and persist a new lead. Throws ZodError on invalid payload or
   * BudgetRangeError when the supplied min/max budget pair is inverted.
   */
  async create(input: unknown): Promise<LeadRecord> {
    const parsed = LeadCreateRequestSchema.parse(input);

    if (
      parsed.budget_min_minor !== undefined &&
      parsed.budget_max_minor !== undefined &&
      parsed.budget_min_minor > parsed.budget_max_minor
    ) {
      throw new BudgetRangeError();
    }

    return this.options.repository.insert({
      fullName: parsed.full_name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      source: parsed.source,
      budgetMinMinor: parsed.budget_min_minor ?? null,
      budgetMaxMinor: parsed.budget_max_minor ?? null,
      notes: parsed.notes ?? null,
    });
  }

  /** Fetch a lead by id; throws LeadNotFoundError when absent. */
  async getById(id: string): Promise<LeadRecord> {
    const lead = await this.options.repository.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    return lead;
  }

  /** List all leads (creation-time order). Pagination lands in Task 7. */
  async list(): Promise<LeadRecord[]> {
    return this.options.repository.list();
  }

  /**
   * Catalog of every accepted lead source plus the live per-source lead count.
   * `all_sources` is the full enum (so admin filters render every option even
   * before any lead lands); `sources` reflects what's in the DB right now.
   */
  async listSources(): Promise<LeadSourceSummary> {
    const sources = await this.options.repository.countBySource();
    return {
      all_sources: [...LeadSourceSchema.options],
      sources,
    };
  }
}
