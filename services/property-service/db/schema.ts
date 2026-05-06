import { bigint, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * properties — Phase-1-Trust-Launch.md §5. `slug` is the URL key on
 * web-public (/properties/<slug>) so it's UNIQUE NOT NULL. `tags` and
 * `media` are jsonb to keep additive evolutions migration-free (e.g.,
 * adding thumbnail dimensions or signed-url metadata to a media ref).
 * `price_min_minor` / `price_max_minor` use bigint so we can carry full
 * INR amounts in paise without losing precision.
 */
export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    title: varchar('title', { length: 200 }).notNull(),
    type: varchar('type', { length: 30 }).notNull(),
    location: varchar('location', { length: 200 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    priceMinMinor: bigint('price_min_minor', { mode: 'number' }),
    priceMaxMinor: bigint('price_max_minor', { mode: 'number' }),
    tags: jsonb('tags').notNull().default([]),
    media: jsonb('media').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('properties_status_idx').on(table.status),
    typeIdx: index('properties_type_idx').on(table.type),
    locationIdx: index('properties_location_idx').on(table.location),
  }),
);

export type PropertyRow = typeof properties.$inferSelect;
export type PropertyInsert = typeof properties.$inferInsert;
