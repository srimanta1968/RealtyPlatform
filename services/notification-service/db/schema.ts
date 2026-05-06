import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: varchar('channel', { length: 20 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  subject: varchar('subject', { length: 200 }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type NotificationTemplateRow = typeof notificationTemplates.$inferSelect;

export const notificationSends = pgTable('notification_sends', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateSlug: varchar('template_slug', { length: 100 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  payload: jsonb('payload').notNull().default({}),
  error: text('error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type NotificationSendRow = typeof notificationSends.$inferSelect;
export type NotificationSendInsert = typeof notificationSends.$inferInsert;
