import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id'),
    fullName: varchar('full_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    source: varchar('source', { length: 50 }).notNull(),
    stage: varchar('stage', { length: 50 }).notNull().default('new'),
    locationInterest: varchar('location_interest', { length: 200 }),
    budgetMinMinor: bigint('budget_min_minor', { mode: 'number' }),
    budgetMaxMinor: bigint('budget_max_minor', { mode: 'number' }),
    notes: text('notes'),
    consentMarketing: boolean('consent_marketing').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index('leads_owner_idx').on(table.ownerId),
    stageIdx: index('leads_stage_idx').on(table.stage),
    sourceIdx: index('leads_source_idx').on(table.source),
  }),
);

export type LeadRow = typeof leads.$inferSelect;
export type LeadInsert = typeof leads.$inferInsert;

/**
 * Append-only timeline of every meaningful event on a lead — created, stage
 * change, ownership reassignment, free-text notes from operators. Powers the
 * GET /api/leads/:id/timeline read endpoint and gives Phase 2+ analytics a
 * complete history without a separate event-store. `actor_id` is nullable
 * because anonymous public-form captures have no authenticated user.
 */
export const leadTimelineEvents = pgTable(
  'lead_timeline_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    payload: jsonb('payload').notNull().default({}),
    actorId: uuid('actor_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    leadIdx: index('lead_timeline_events_lead_idx').on(table.leadId),
    occurredIdx: index('lead_timeline_events_occurred_idx').on(table.occurredAt),
  }),
);

export type LeadTimelineEventRow = typeof leadTimelineEvents.$inferSelect;
export type LeadTimelineEventInsert = typeof leadTimelineEvents.$inferInsert;

/**
 * Append-only audit trail for every state-changing action on entities owned
 * by lead-service. Phase-1 captures lead.stage_changed + lead.assigned;
 * Phase-2+ services can write here too. Append-only is enforced by a
 * Postgres trigger (see bootstrap.ts) — UPDATE / DELETE raise.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    requestId: varchar('request_id', { length: 100 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('audit_log_entity_idx').on(table.entityType, table.entityId),
    occurredIdx: index('audit_log_occurred_idx').on(table.occurredAt),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;
