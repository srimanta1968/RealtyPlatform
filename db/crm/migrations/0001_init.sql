-- crm_db — initial schema
-- Owner: services/crm-service

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(50) NOT NULL,
  lead_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  owner_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS workflows_lead_idx ON workflows (lead_id);
CREATE INDEX IF NOT EXISTS workflows_status_idx ON workflows (status);
