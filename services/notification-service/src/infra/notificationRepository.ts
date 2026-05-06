import type { NodePgDatabase } from '@kiana/db-kit';

import {
  notificationSends,
  notificationTemplates,
  type NotificationSendInsert,
  type NotificationSendRow,
} from '../../db/schema.js';

type Schema = {
  notificationSends: typeof notificationSends;
  notificationTemplates: typeof notificationTemplates;
};
type Db = NodePgDatabase<Schema>;

export interface NotificationRepository {
  recordSend(input: NotificationSendInsert): Promise<NotificationSendRow>;
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
  };
}
