/**
 * Idempotent schema bootstrap for lead-service. Runs on every startup before
 * the Fastify instance binds its port; uses CREATE TABLE / INDEX IF NOT EXISTS
 * so subsequent restarts are a fast no-op. Mirrors db/schema.ts exactly —
 * keep the two in sync. Additive evolutions (new columns, new tables) belong
 * here as further `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` statements;
 * destructive changes (rename, drop, type change) need a dedicated migration.
 */
export const LEAD_SERVICE_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  source VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'new',
  budget_min_minor BIGINT,
  budget_max_minor BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_owner_idx ON leads(owner_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON leads(stage);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);

CREATE TABLE IF NOT EXISTS lead_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  actor_id UUID,
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_timeline_events_lead_idx ON lead_timeline_events(lead_id);
CREATE INDEX IF NOT EXISTS lead_timeline_events_occurred_idx ON lead_timeline_events(occurred_at);
`;
