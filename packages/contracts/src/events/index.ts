import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  asEventId,
  type EventId,
  type LeadId,
  type PropertyId,
  type UserId,
  type VisitId,
  type WorkflowId,
} from '../primitives/ids.js';
import type { LeadStage, VisitStatus } from '../enums/index.js';
import { LeadSourceSchema, LeadStageSchema, type LeadSource } from '../services/lead.js';
import { PropertyStatusSchema, PropertyTypeSchema } from '../services/property.js';
import type { PropertyStatus, PropertyType } from '../services/property.js';

const VisitStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

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

/** Zod schema for the envelope frame. Compose with a payload schema via `eventEnvelopeSchema(...)`. */
export const EventActorSchema = z.object({
  type: z.enum(['user', 'system']),
  id: z.string().nullable(),
});

/**
 * Build a Zod schema for `EventEnvelope<TName, TPayload>` given the
 * event_type literal and the payload schema. Used by subscribers when
 * they want runtime validation on inbound envelopes — the wire surface
 * is otherwise duck-typed and a malformed payload would silently slip
 * past TypeScript's compile-time checks.
 *
 *     const Schema = eventEnvelopeSchema('lead.created', LeadCreatedPayloadSchema);
 *     const envelope = Schema.parse(rawJson);
 */
export function eventEnvelopeSchema<TName extends string, TPayload>(
  eventType: TName,
  payloadSchema: z.ZodType<TPayload>,
) {
  return z.object({
    event_id: z.string().uuid(),
    event_type: z.literal(eventType),
    version: z.literal('1'),
    occurred_at: z.string().datetime(),
    actor: EventActorSchema,
    payload: payloadSchema,
    tenant_id: z.string().optional(),
    correlation_id: z.string().optional(),
    causation_id: z.string().optional(),
  });
}

export interface MakeEnvelopeContext {
  actorId?: string | null;
  requestId?: string | null;
}

/**
 * Build an EventEnvelope with the canonical Phase-1 shape. Producers
 * should always go through this helper so event_id is a fresh UUID,
 * version is locked at '1', and occurred_at is set to "now". When
 * `actorId` is supplied the actor.type is 'user'; otherwise 'system'
 * (e.g. background workers, scheduled jobs).
 */
export function makeEnvelope<TName extends string, TPayload>(
  eventType: TName,
  payload: TPayload,
  context: MakeEnvelopeContext = {},
): EventEnvelope<TName, TPayload> {
  return {
    event_id: asEventId(randomUUID()),
    event_type: eventType,
    version: '1',
    occurred_at: new Date().toISOString(),
    actor: { type: context.actorId ? 'user' : 'system', id: context.actorId ?? null },
    payload,
    correlation_id: context.requestId ?? undefined,
  };
}

// =============================================================================
//  Per-event payload contracts. Each payload has BOTH a TypeScript type and a
//  Zod schema so subscribers can choose: type-only at compile time (cheap) or
//  runtime parse via `eventEnvelopeSchema(<event_type>, <PayloadSchema>)`.
// =============================================================================

export const UserRegisteredPayloadSchema = z.object({
  user_id: z.string(),
  email: z.string().email(),
});
export type UserRegisteredPayload = z.infer<typeof UserRegisteredPayloadSchema>;

export const LeadCreatedPayloadSchema = z.object({
  lead_id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  source: LeadSourceSchema,
  stage: LeadStageSchema,
  owner_id: z.string().nullable(),
});
export type LeadCreatedPayload = z.infer<typeof LeadCreatedPayloadSchema>;

export const LeadStageChangedPayloadSchema = z.object({
  lead_id: z.string(),
  from_stage: LeadStageSchema,
  to_stage: LeadStageSchema,
});
export type LeadStageChangedPayload = z.infer<typeof LeadStageChangedPayloadSchema>;

export const LeadAssignedPayloadSchema = z.object({
  lead_id: z.string(),
  from_owner_id: z.string().nullable(),
  to_owner_id: z.string(),
});
export type LeadAssignedPayload = z.infer<typeof LeadAssignedPayloadSchema>;

export const PropertyPublishedPayloadSchema = z.object({
  property_id: z.string(),
  slug: z.string(),
  type: PropertyTypeSchema,
  status: PropertyStatusSchema,
});
export type PropertyPublishedPayload = z.infer<typeof PropertyPublishedPayloadSchema>;

export const VisitScheduledPayloadSchema = z.object({
  visit_id: z.string(),
  lead_id: z.string(),
  property_id: z.string(),
  scheduled_for: z.string().datetime(),
});
export type VisitScheduledPayload = z.infer<typeof VisitScheduledPayloadSchema>;

export const VisitOutcomePayloadSchema = z.object({
  visit_id: z.string(),
  status: VisitStatusSchema,
  notes: z.string().optional(),
});
export type VisitOutcomePayload = z.infer<typeof VisitOutcomePayloadSchema>;

// =============================================================================
//  Branded envelope aliases — use these to type-narrow without re-stating the
//  payload shape at every call site.
// =============================================================================

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
