import type { LeadId, PropertyId, UserId, VisitId, WorkflowId, EventId } from '../primitives/ids.js';
import type { LeadStage, VisitStatus } from '../enums/index.js';

export interface EventEnvelope<TName extends string, TPayload> {
  readonly id: EventId;
  readonly name: TName;
  readonly version: number;
  readonly occurred_at: string;
  readonly tenant_id: string;
  readonly correlation_id?: string;
  readonly causation_id?: string;
  readonly payload: TPayload;
}

export type UserRegistered = EventEnvelope<
  'user.registered',
  { user_id: UserId; email: string }
>;

export type LeadCreated = EventEnvelope<
  'lead.created',
  { lead_id: LeadId; owner_id: UserId | null; source: string }
>;

export type LeadStageChanged = EventEnvelope<
  'lead.stage_changed',
  { lead_id: LeadId; from_stage: LeadStage; to_stage: LeadStage }
>;

export type VisitScheduled = EventEnvelope<
  'visit.scheduled',
  { visit_id: VisitId; lead_id: LeadId; property_id: PropertyId; scheduled_for: string }
>;

export type VisitOutcome = EventEnvelope<
  'visit.outcome',
  { visit_id: VisitId; status: VisitStatus; notes?: string }
>;

export type WorkflowStarted = EventEnvelope<
  'workflow.started',
  { workflow_id: WorkflowId; kind: string }
>;

export type WorkflowCompleted = EventEnvelope<
  'workflow.completed',
  { workflow_id: WorkflowId; outcome: 'success' | 'cancelled' | 'failed' }
>;

export type DomainEvent =
  | UserRegistered
  | LeadCreated
  | LeadStageChanged
  | VisitScheduled
  | VisitOutcome
  | WorkflowStarted
  | WorkflowCompleted;
