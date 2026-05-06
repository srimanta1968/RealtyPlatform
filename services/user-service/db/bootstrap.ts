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

-- Idempotent migration: add the Phase-1 RBAC role column. PostgreSQL 11+
-- backfills existing rows with the DEFAULT in a single statement, so this
-- one line covers both add-on-fresh-DB and add-to-pre-existing-DB.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'presales';

-- Phase-1-Trust-Launch.md §5 alignment — User { id, name, email, phone,
-- role, active }. phone is nullable because legacy demo registrations
-- don't have one; active defaults to true for the same reason.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

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

-- Phase-1 Task #22 — admin-issued invitations for new staff accounts.
-- Invite carries the future role + email and a one-shot token; accepting
-- consumes it and creates the user row at the role baked into the invite.
CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  full_name VARCHAR(200),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS staff_invites_token_idx ON staff_invites(token);
CREATE INDEX IF NOT EXISTS staff_invites_email_idx ON staff_invites(email);
`;
