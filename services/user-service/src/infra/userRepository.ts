import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from '@kiana/db-kit';

import { users, type UserRow } from '../../db/schema.js';
import { asUserId, type PublicUser } from '@kiana/contracts';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRow | null>;
  create(input: CreateUserInput): Promise<PublicUser>;
}

type Db = NodePgDatabase<{ users: typeof users }>;

export function createUserRepository(db: Db): UserRepository {
  return {
    async findByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return row ?? null;
    },
    async create({ email, passwordHash }) {
      const [row] = await db
        .insert(users)
        .values({ email, passwordHash })
        .returning();
      if (!row) {
        throw new Error('Failed to insert user — no row returned');
      }
      return {
        id: asUserId(row.id),
        email: row.email,
        created_at: row.createdAt.toISOString(),
      };
    },
  };
}
