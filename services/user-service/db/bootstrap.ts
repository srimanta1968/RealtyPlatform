/**
 * Idempotent schema bootstrap for user-service. Runs on every startup before
 * the Fastify instance binds its port; uses CREATE TABLE / INDEX IF NOT EXISTS
 * so subsequent restarts are a fast no-op. Mirrors db/schema.ts exactly —
 * keep the two in sync. Additive evolutions (new columns, new tables) belong
 * here as further `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` statements;
 * destructive changes (rename, drop, type change) need a dedicated migration.
 */
export const USER_SERVICE_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Idempotent migration: existing DBs created before full_name was introduced
-- get the column added (nullable), backfilled from email, then locked NOT NULL.
-- Each statement is safe to re-run on subsequent startups.
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);
UPDATE users SET full_name = email WHERE full_name IS NULL;
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS email_verifications_token_idx ON email_verifications(token);
CREATE INDEX IF NOT EXISTS email_verifications_user_idx ON email_verifications(user_id);
`;
