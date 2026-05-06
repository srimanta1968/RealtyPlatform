/**
 * Idempotent schema bootstrap for property-service. Runs on every startup
 * before the Fastify instance binds its port; uses CREATE TABLE / INDEX
 * IF NOT EXISTS so subsequent restarts are a fast no-op. Mirrors db/schema.ts
 * exactly. Additive evolutions land here as further `IF NOT EXISTS` /
 * `ADD COLUMN IF NOT EXISTS` statements; destructive changes (rename,
 * drop, type change) need a dedicated migration.
 */
export const PROPERTY_SERVICE_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(30) NOT NULL,
  location VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  price_min_minor BIGINT,
  price_max_minor BIGINT,
  tags JSONB NOT NULL DEFAULT '[]',
  media JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS properties_status_idx ON properties(status);
CREATE INDEX IF NOT EXISTS properties_type_idx ON properties(type);
CREATE INDEX IF NOT EXISTS properties_location_idx ON properties(location);
`;
