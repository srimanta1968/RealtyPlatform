import { bigint, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
    budgetMinMinor: bigint('budget_min_minor', { mode: 'number' }),
    budgetMaxMinor: bigint('budget_max_minor', { mode: 'number' }),
    notes: text('notes'),
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
