import type {
  EventId,
  LeadId,
  PropertyId,
  UserId,
  VisitId,
  WorkflowId,
} from '../primitives/ids.js';
import type { LeadStage, VisitStatus } from '../enums/index.js';
import type { LeadSource } from '../services/lead.js';
import type { PropertyStatus, PropertyType } from '../services/property.js';

/**
 * Canonical event envelope per docs/Phase/Phase-1-Trust-Launch.md §6.
 * Field names match the spec exactly so any subscriber Phase 2+ adds can
 * trust the wire shape:
 *
 *   { event_id, event_type, version, occurred_at, actor, payload }
 *
 * `tenant_id` / `correlation_id` / `causation_id` are platform-internal
 * extensions — optional, used by tracing and multi-tenancy in later
 * phases. Subscribers SHOULD ignore unknown fields.
 */
export interface EventEnvelope<TName extends string, TPayload> {
  readonly event_id: EventId;
  readonly event_type: TName;
  readonly version: '1';
  readonly occurred_at: string;
  readonly actor: { type: 'user' | 'system'; id: string | null };
  readonly payload: TPayload;
  readonly tenant_id?: string;
  readonly correlation_id?: string;
  readonly causation_id?: string;
}

export type UserRegistered = EventEnvelope<
  'user.registered',
  { user_id: UserId; email: string }
>;

export type LeadCreated = EventEnvelope<
  'lead.created',
  {
    lead_id: LeadId;
    full_name: string;
    email: string | null;
    phone: string | null;
    source: LeadSource;
    stage: LeadStage;
    owner_id: UserId | null;
  }
>;

export type LeadStageChanged = EventEnvelope<
  'lead.stage_changed',
  { lead_id: LeadId; from_stage: LeadStage; to_stage: LeadStage }
>;

export type LeadAssigned = EventEnvelope<
  'lead.assigned',
  { lead_id: LeadId; from_owner_id: UserId | null; to_owner_id: UserId }
>;

export type PropertyPublished = EventEnvelope<
  'property.published',
  { property_id: PropertyId; slug: string; type: PropertyType; status: PropertyStatus }
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
  | LeadAssigned
  | PropertyPublished
  | VisitScheduled
  | VisitOutcome
  | WorkflowStarted
  | WorkflowCompleted;
