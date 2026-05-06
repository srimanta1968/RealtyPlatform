import type { NodePgDatabase } from '@kiana/db-kit';

import { auditLog, type AuditLogRow } from '../../db/schema.js';

export interface RecordAuditInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
}

export interface AuditRepository {
  record(input: RecordAuditInput): Promise<AuditLogRow>;
}

type Db = NodePgDatabase<{ auditLog: typeof auditLog }>;

/**
 * Build a Drizzle-backed audit repository. The append-only contract is
 * enforced server-side by a Postgres trigger (see db/bootstrap.ts) — this
 * client only exposes a single record() method on purpose.
 */
export function createAuditRepository(db: Db): AuditRepository {
  return {
    async record(input) {
      const [row] = await db
        .insert(auditLog)
        .values({
          actorId: input.actorId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          before: (input.before ?? null) as never,
          after: (input.after ?? null) as never,
          requestId: input.requestId ?? null,
        })
        .returning();
      if (!row) {
        throw new Error('Failed to insert audit_log row — no row returned');
      }
      return row;
    },
  };
}
