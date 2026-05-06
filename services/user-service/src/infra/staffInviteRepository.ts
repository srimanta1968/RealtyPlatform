import { and, eq, gt, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import { staffInvites, type StaffInviteRow } from '../../db/schema.js';
import type { StaffInvite, UserRole } from '@kiana/contracts';

export interface InsertStaffInviteInput {
  email: string;
  role: UserRole;
  fullName: string | null;
  invitedBy: string | null;
  token: string;
  expiresAt: Date;
}

export interface StaffInviteRepository {
  insert(input: InsertStaffInviteInput): Promise<StaffInviteRow>;
  findActiveByToken(token: string, now: Date): Promise<StaffInviteRow | null>;
  markAccepted(id: string, when: Date): Promise<void>;
}

type Schema = { staffInvites: typeof staffInvites };
type Db = NodePgDatabase<Schema>;

/**
 * Map a raw row onto the public StaffInvite contract. ISO-string the
 * timestamps so consumers don't see Date objects across the wire.
 */
export function toStaffInvite(row: StaffInviteRow): StaffInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    full_name: row.fullName,
    invited_by: row.invitedBy,
    expires_at: row.expiresAt.toISOString(),
    accepted_at: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    revoked_at: row.revokedAt ? row.revokedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
  };
}

export function createStaffInviteRepository(db: Db): StaffInviteRepository {
  return {
    async insert({ email, role, fullName, invitedBy, token, expiresAt }) {
      const [row] = await db
        .insert(staffInvites)
        .values({
          email,
          role,
          fullName,
          invitedBy,
          token,
          expiresAt,
        })
        .returning();
      if (!row) throw new Error('Failed to insert staff invite — no row returned');
      return row;
    },

    async findActiveByToken(token, now) {
      const [row] = await db
        .select()
        .from(staffInvites)
        .where(
          and(
            eq(staffInvites.token, token),
            isNull(staffInvites.acceptedAt),
            isNull(staffInvites.revokedAt),
            gt(staffInvites.expiresAt, now),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async markAccepted(id, when) {
      await db
        .update(staffInvites)
        .set({ acceptedAt: when })
        .where(eq(staffInvites.id, id));
    },
  };
}
