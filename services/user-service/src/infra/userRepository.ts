import { and, eq, gt, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import {
  emailVerifications,
  users,
  type EmailVerificationRow,
  type UserRow,
} from '../../db/schema.js';
import { asUserId, type PublicUser, type UserRole } from '@kiana/contracts';

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
  /** Defaults to 'presales' at the DB level; admin-only invite flow can override. */
  role?: UserRole;
}

export interface CreateVerificationInput {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  findById(id: string): Promise<UserRow | null>;
  create(input: CreateUserInput): Promise<PublicUser>;
  toPublic(row: UserRow): PublicUser;

  createVerification(input: CreateVerificationInput): Promise<EmailVerificationRow>;
  findActiveVerification(token: string, now: Date): Promise<EmailVerificationRow | null>;
  consumeVerification(verificationId: string, when: Date): Promise<void>;
  markEmailVerified(userId: string, when: Date): Promise<UserRow>;
}

type Schema = { users: typeof users; emailVerifications: typeof emailVerifications };
type Db = NodePgDatabase<Schema>;

/** Build a Drizzle-backed user repository against the user_db handle. */
export function createUserRepository(db: Db): UserRepository {
  function toPublic(row: UserRow): PublicUser {
    return {
      id: asUserId(row.id),
      full_name: row.fullName,
      email: row.email,
      role: row.role as UserRole,
      created_at: row.createdAt.toISOString(),
      email_verified_at: row.emailVerifiedAt ? row.emailVerifiedAt.toISOString() : null,
    };
  }

  return {
    toPublic,

    async findByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return row ?? null;
    },

    async findById(id: string) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ?? null;
    },

    async create({ fullName, email, passwordHash, role }) {
      const [row] = await db
        .insert(users)
        .values({ fullName, email, passwordHash, ...(role !== undefined ? { role } : {}) })
        .returning();
      if (!row) {
        throw new Error('Failed to insert user — no row returned');
      }
      return toPublic(row);
    },

    async createVerification({ userId, token, expiresAt }) {
      const [row] = await db
        .insert(emailVerifications)
        .values({ userId, token, expiresAt })
        .returning();
      if (!row) {
        throw new Error('Failed to insert email verification — no row returned');
      }
      return row;
    },

    async findActiveVerification(token: string, now: Date) {
      const [row] = await db
        .select()
        .from(emailVerifications)
        .where(
          and(
            eq(emailVerifications.token, token),
            isNull(emailVerifications.usedAt),
            gt(emailVerifications.expiresAt, now),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async consumeVerification(verificationId: string, when: Date) {
      await db
        .update(emailVerifications)
        .set({ usedAt: when })
        .where(eq(emailVerifications.id, verificationId));
    },

    async markEmailVerified(userId: string, when: Date) {
      const [row] = await db
        .update(users)
        .set({ emailVerifiedAt: when, updatedAt: when })
        .where(eq(users.id, userId))
        .returning();
      if (!row) {
        throw new Error(`User ${userId} not found while marking email verified`);
      }
      return row;
    },
  };
}
