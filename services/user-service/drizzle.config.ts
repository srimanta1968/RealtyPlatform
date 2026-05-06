import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: '../../db/user/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/user_db',
  },
} satisfies Config;
