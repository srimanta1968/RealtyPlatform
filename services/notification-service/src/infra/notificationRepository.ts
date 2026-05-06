import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import type {
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateUpsertRequest,
} from '@kiana/contracts';

import {
  notificationSends,
  notificationTemplates,
  type NotificationSendInsert,
  type NotificationSendRow,
  type NotificationTemplateRow,
} from '../../db/schema.js';

type Schema = {
  notificationSends: typeof notificationSends;
  notificationTemplates: typeof notificationTemplates;
};
type Db = NodePgDatabase<Schema>;

export interface NotificationRepository {
  recordSend(input: NotificationSendInsert): Promise<NotificationSendRow>;
  upsertTemplate(input: NotificationTemplateUpsertRequest): Promise<NotificationTemplate>;
  findTemplateBySlug(slug: string): Promise<NotificationTemplate | null>;
  listTemplates(): Promise<NotificationTemplate[]>;
}

function toTemplate(row: NotificationTemplateRow): NotificationTemplate {
  return {
    id: row.id,
    slug: row.slug,
    channel: row.channel as NotificationChannel,
    subject: row.subject,
    body: row.body,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function createNotificationRepository(db: Db): NotificationRepository {
  return {
    async recordSend(input) {
      const [row] = await db.insert(notificationSends).values(input).returning();
      if (!row) {
        throw new Error('Failed to record notification send — no row returned');
      }
      return row;
    },

    async upsertTemplate({ slug, channel, subject, body }) {
      const [row] = await db
        .insert(notificationTemplates)
        .values({ slug, channel, subject: subject ?? null, body })
        .onConflictDoUpdate({
          target: notificationTemplates.slug,
          set: {
            channel,
            subject: subject ?? null,
            body,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!row) {
        throw new Error('Failed to upsert notification template — no row returned');
      }
      return toTemplate(row);
    },

    async findTemplateBySlug(slug) {
      const [row] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.slug, slug))
        .limit(1);
      return row ? toTemplate(row) : null;
    },

    async listTemplates() {
      const rows = await db
        .select()
        .from(notificationTemplates)
        .orderBy(notificationTemplates.slug);
      return rows.map(toTemplate);
    },
  };
}
