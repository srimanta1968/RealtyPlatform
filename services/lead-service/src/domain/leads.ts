import {
  LEAD_TO_CUSTOMER_WORKFLOW,
  LeadCreateRequestSchema,
  LeadSourceSchema,
  LeadUpdateRequestSchema,
  WORKFLOW_CATALOG,
  computeWorkflowExecution,
  type LeadRecord,
  type LeadSourceSummary,
  type WorkflowDefinition,
  type WorkflowExecutionState,
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

export class WorkflowNotRegisteredError extends Error {
  constructor(slug: string) {
    super(`Workflow ${slug} is not registered.`);
    this.name = 'WorkflowNotRegisteredError';
  }
}

export class WorkflowAtTerminalError extends Error {
  constructor(stage: string) {
    super(`Lead is at terminal stage '${stage}' and cannot be advanced.`);
    this.name = 'WorkflowAtTerminalError';
  }
}

export class WorkflowAtFinalStepError extends Error {
  constructor(stepKey: string) {
    super(`Lead is on final workflow step '${stepKey}' — already at the end.`);
    this.name = 'WorkflowAtFinalStepError';
  }
}

export interface WorkflowExecutionResult {
  lead: LeadRecord;
  execution: WorkflowExecutionState;
}

function resolveWorkflow(slug?: string): WorkflowDefinition {
  if (!slug) return LEAD_TO_CUSTOMER_WORKFLOW;
  const workflow = WORKFLOW_CATALOG[slug];
  if (!workflow) throw new WorkflowNotRegisteredError(slug);
  return workflow;
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

  /**
   * Advance a lead through the pipeline by setting a new stage. Validates
   * the payload with LeadUpdateRequestSchema; throws LeadNotFoundError when
   * the id does not resolve to a row. Free transitions for now — workflow
   * gates (e.g. "qualified → visit_scheduled requires owner_id") land later.
   */
  async updateStage(id: string, input: unknown): Promise<LeadRecord> {
    const parsed = LeadUpdateRequestSchema.parse(input);
    const lead = await this.options.repository.updateStage(id, parsed.stage);
    if (!lead) throw new LeadNotFoundError(id);
    return lead;
  }

  /**
   * Raw per-stage lead counts, used by the workflow metrics endpoint to
   * compose funnel statistics. Delegates straight to the repository — kept
   * on the domain so the route handler doesn't reach past it into infra.
   */
  async countByStage() {
    return this.options.repository.countByStage();
  }

  /**
   * Read-only view of a lead alongside its computed workflow execution cursor.
   * `slug` selects which workflow to compute against; defaults to the
   * lead-to-customer pipeline.
   */
  async getWorkflowExecution(id: string, slug?: string): Promise<WorkflowExecutionResult> {
    const lead = await this.options.repository.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    const workflow = resolveWorkflow(slug);
    return { lead, execution: computeWorkflowExecution(workflow, lead.stage) };
  }

  /**
   * Persist the lead onto the next workflow step's stage. Refuses when the
   * lead has already reached a terminal stage or the final step.
   */
  async advanceWorkflow(id: string, slug?: string): Promise<WorkflowExecutionResult> {
    const lead = await this.options.repository.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    const workflow = resolveWorkflow(slug);
    if (workflow.terminalStages.includes(lead.stage)) {
      throw new WorkflowAtTerminalError(lead.stage);
    }
    const execution = computeWorkflowExecution(workflow, lead.stage);
    if (!execution.next_step) {
      throw new WorkflowAtFinalStepError(execution.current_step?.key ?? 'unknown');
    }
    const updated = await this.options.repository.updateStage(id, execution.next_step.stage);
    if (!updated) throw new LeadNotFoundError(id);
    return { lead: updated, execution: computeWorkflowExecution(workflow, updated.stage) };
  }
}
