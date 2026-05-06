import {
  LEAD_TO_CUSTOMER_WORKFLOW,
  LeadCreateRequestSchema,
  LeadNoteCreateRequestSchema,
  LeadOwnerUpdateRequestSchema,
  LeadSourceSchema,
  LeadUpdateRequestSchema,
  WORKFLOW_CATALOG,
  asUserId,
  computeWorkflowExecution,
  type LeadRecord,
  type LeadSourceSummary,
  type LeadTimelineEvent,
  type WorkflowDefinition,
  type WorkflowExecutionState,
} from '@kiana/contracts';

import type { LeadRepository } from '../infra/leadRepository.js';
import type { AuditRepository } from '../infra/auditRepository.js';
import type { TimelineRepository } from '../infra/timelineRepository.js';
import { makeEnvelope, type EventPublisher } from '../infra/eventPublisher.js';

/** Captured at the route boundary and threaded through mutating domain calls. */
export interface AuditContext {
  actorId?: string | null;
  requestId?: string | null;
}

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
  /** When provided, mutating methods append an audit_log row on each detected change. */
  audit?: AuditRepository;
  /** When provided, mutating methods emit envelope events on create / stage change. */
  events?: EventPublisher;
  /** When provided, getTimeline() / addNote() are available. */
  timeline?: TimelineRepository;
}

export class LeadDomain {
  constructor(private readonly options: LeadDomainOptions) {}

  /**
   * Validate and persist a new lead. Throws ZodError on invalid payload or
   * BudgetRangeError when the supplied min/max budget pair is inverted.
   * Emits a lead.created envelope event on success when an EventPublisher
   * is configured.
   */
  async create(input: unknown, context: AuditContext = {}): Promise<LeadRecord> {
    const parsed = LeadCreateRequestSchema.parse(input);

    if (
      parsed.budget_min_minor !== undefined &&
      parsed.budget_max_minor !== undefined &&
      parsed.budget_min_minor > parsed.budget_max_minor
    ) {
      throw new BudgetRangeError();
    }

    const lead = await this.options.repository.insert({
      fullName: parsed.full_name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      source: parsed.source,
      locationInterest: parsed.location_interest ?? null,
      budgetMinMinor: parsed.budget_min_minor ?? null,
      budgetMaxMinor: parsed.budget_max_minor ?? null,
      notes: parsed.notes ?? null,
      ...(parsed.consent_marketing !== undefined
        ? { consentMarketing: parsed.consent_marketing }
        : {}),
    });

    if (this.options.events) {
      await this.options.events.publish(
        makeEnvelope(
          'lead.created',
          {
            lead_id: lead.id,
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            stage: lead.stage,
            owner_id: lead.owner_id,
          },
          context,
        ),
      );
    }
    return lead;
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
   * Apply a partial update to a lead — currently `stage` and/or `notes`.
   * Validates with LeadUpdateRequestSchema (which requires at least one of
   * the two), throws LeadNotFoundError when the id does not resolve. Free
   * transitions for now — workflow gates (e.g. "qualified → visit_scheduled
   * requires owner_id") land later.
   *
   * When the LeadDomain was constructed with an audit repository, every
   * detected stage change appends a 'lead.stage_changed' row to audit_log.
   */
  async updateLead(
    id: string,
    input: unknown,
    context: AuditContext = {},
  ): Promise<LeadRecord> {
    const parsed = LeadUpdateRequestSchema.parse(input);
    const before = await this.options.repository.findById(id);
    if (!before) throw new LeadNotFoundError(id);
    const after = await this.options.repository.updateFields(id, parsed);
    if (!after) throw new LeadNotFoundError(id);
    if (before.stage !== after.stage) {
      if (this.options.audit) {
        await this.options.audit.record({
          actorId: context.actorId,
          action: 'lead.stage_changed',
          entityType: 'lead',
          entityId: id,
          before: { stage: before.stage },
          after: { stage: after.stage },
          requestId: context.requestId,
        });
      }
      if (this.options.events) {
        await this.options.events.publish(
          makeEnvelope(
            'lead.stage_changed',
            { lead_id: after.id, from_stage: before.stage, to_stage: after.stage },
            context,
          ),
        );
      }
    }
    return after;
  }

  /**
   * Hard-delete a lead. Throws LeadNotFoundError when the id doesn't
   * resolve to a row so the route can map onto a 404. Soft-delete /
   * archival lands when audit history becomes a real concern (P2+).
   */
  async deleteLead(id: string): Promise<void> {
    const removed = await this.options.repository.delete(id);
    if (!removed) throw new LeadNotFoundError(id);
  }

  /**
   * Read the append-only event timeline for a lead. Returns rows in
   * reverse-chronological order; throws LeadNotFoundError when the
   * lead row itself is gone (the timeline cascades on lead delete).
   */
  async getTimeline(id: string): Promise<LeadTimelineEvent[]> {
    if (!this.options.timeline) {
      throw new Error('LeadDomain.getTimeline() requires a TimelineRepository');
    }
    const lead = await this.options.repository.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    const rows = await this.options.timeline.listForLead(id);
    return rows.map((row) => ({
      id: row.id,
      lead_id: row.leadId,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      actor_id: row.actorId,
      occurred_at: row.occurredAt.toISOString(),
    }));
  }

  /**
   * Append an operator-authored note to the lead timeline. Stored as a
   * `lead.note` event with payload {body}; the existing GET
   * /api/leads/:id/timeline surfaces it alongside system events.
   */
  async addNote(
    id: string,
    input: unknown,
    context: AuditContext = {},
  ): Promise<LeadTimelineEvent> {
    if (!this.options.timeline) {
      throw new Error('LeadDomain.addNote() requires a TimelineRepository');
    }
    const parsed = LeadNoteCreateRequestSchema.parse(input);
    const lead = await this.options.repository.findById(id);
    if (!lead) throw new LeadNotFoundError(id);
    const row = await this.options.timeline.append({
      leadId: id,
      type: 'lead.note',
      payload: { body: parsed.body },
      actorId: context.actorId ?? null,
    });
    return {
      id: row.id,
      lead_id: row.leadId,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      actor_id: row.actorId,
      occurred_at: row.occurredAt.toISOString(),
    };
  }

  /**
   * Reassign a lead to a different presales owner. Records an audit
   * row + emits a `lead.assigned` envelope event so notification
   * subscribers can ping the new owner. No-op when the supplied owner
   * already matches (still emits the event for downstream
   * idempotency).
   */
  async reassignOwner(
    id: string,
    input: unknown,
    context: AuditContext = {},
  ): Promise<LeadRecord> {
    const parsed = LeadOwnerUpdateRequestSchema.parse(input);
    const before = await this.options.repository.findById(id);
    if (!before) throw new LeadNotFoundError(id);
    const after = await this.options.repository.updateFields(id, {
      ownerId: parsed.owner_id,
    });
    if (!after) throw new LeadNotFoundError(id);
    if (before.owner_id !== after.owner_id) {
      if (this.options.audit) {
        await this.options.audit.record({
          actorId: context.actorId,
          action: 'lead.assigned',
          entityType: 'lead',
          entityId: id,
          before: { owner_id: before.owner_id },
          after: { owner_id: after.owner_id },
          requestId: context.requestId,
        });
      }
      if (this.options.events) {
        await this.options.events.publish(
          makeEnvelope(
            'lead.assigned',
            {
              lead_id: after.id,
              from_owner_id: before.owner_id,
              to_owner_id: asUserId(parsed.owner_id),
            },
            context,
          ),
        );
      }
    }
    return after;
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
   * Leads stuck in non-terminal stages — i.e. updated_at older than the
   * given threshold AND stage NOT in the given workflow's terminal set.
   * Defaults to the lead-to-customer workflow's terminals. `daysOld` is
   * clamped to a minimum of 1 day so a stray 0 doesn't flood the
   * monitoring dashboard with every lead.
   */
  async listStaleLeads(daysOld = 7, workflowSlug?: string): Promise<{
    leads: LeadRecord[];
    threshold_days: number;
    older_than: string;
  }> {
    const safeDays = Math.max(1, Math.floor(daysOld));
    const olderThan = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const workflow = resolveWorkflow(workflowSlug);
    const stale = await this.options.repository.findStale(olderThan, workflow.terminalStages);
    return {
      leads: stale,
      threshold_days: safeDays,
      older_than: olderThan.toISOString(),
    };
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
   * lead has already reached a terminal stage or the final step. Same
   * audit-on-stage-change behaviour as updateLead.
   */
  async advanceWorkflow(
    id: string,
    slug?: string,
    context: AuditContext = {},
  ): Promise<WorkflowExecutionResult> {
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
    const updated = await this.options.repository.updateFields(id, {
      stage: execution.next_step.stage,
    });
    if (!updated) throw new LeadNotFoundError(id);
    if (this.options.audit) {
      await this.options.audit.record({
        actorId: context.actorId,
        action: 'lead.stage_changed',
        entityType: 'lead',
        entityId: id,
        before: { stage: lead.stage },
        after: { stage: updated.stage },
        requestId: context.requestId,
      });
    }
    if (this.options.events) {
      await this.options.events.publish(
        makeEnvelope(
          'lead.stage_changed',
          { lead_id: updated.id, from_stage: lead.stage, to_stage: updated.stage },
          context,
        ),
      );
    }
    return { lead: updated, execution: computeWorkflowExecution(workflow, updated.stage) };
  }
}
