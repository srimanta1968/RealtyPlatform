/**
 * Idempotent schema bootstrap for notification-service. Runs on every startup
 * before the Fastify instance binds its port; uses CREATE TABLE IF NOT EXISTS
 * so subsequent restarts are a fast no-op. Mirrors db/schema.ts exactly —
 * keep the two in sync. Additive evolutions (new columns, new tables) belong
 * here as further `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` statements;
 * destructive changes (rename, drop, type change) need a dedicated migration.
 */
export const NOTIFICATION_SERVICE_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(200),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug VARCHAR(100) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
`;
