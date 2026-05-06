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

-- Phase-1 canonical seed templates per docs/Phase/Phase-1-Trust-Launch.md §4.
-- Idempotent: ON CONFLICT (slug) DO NOTHING preserves any operator overrides
-- applied via POST /api/notifications/templates. Operators tune the body /
-- subject through the admin endpoint; only fresh deploys land these defaults.
INSERT INTO notification_templates (slug, channel, subject, body)
VALUES (
  'verification',
  'email',
  'Verify your Kiana account',
  E'Hi {{full_name}},\n\nThanks for signing up. Please confirm your email to finish setting up your account:\n\n{{verification_url}}\n\nThis link expires {{expires_at}}.\n\n— The Kiana team'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO notification_templates (slug, channel, subject, body)
VALUES (
  'lead_created_customer',
  'email',
  'We got your enquiry, {{full_name}}',
  E'Hi {{full_name}},\n\nThanks for reaching out to Kiana Realty. A presales specialist will be in touch within one business day to walk you through next steps.\n\nIn the meantime, feel free to reply to this email with any questions.\n\n— The Kiana team'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO notification_templates (slug, channel, subject, body)
VALUES (
  'lead_created_presales',
  'email',
  'New lead: {{full_name}} ({{source}})',
  E'A new lead just landed from {{source}}.\n\n• Name: {{full_name}}\n• Email: {{email}}\n• Phone: {{phone}}\n• Stage: {{stage}}\n\nFollow up at: {{lead_url}}\n\nResponse-time SLA: 30 minutes during business hours.'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO notification_templates (slug, channel, subject, body)
VALUES (
  'stage_changed',
  'email',
  'Your enquiry is now {{to_stage}}',
  E'Hi {{full_name}},\n\nYour enquiry has moved from {{from_stage}} to {{to_stage}}. We''ll be in touch soon with the next steps.\n\n— The Kiana team'
)
ON CONFLICT (slug) DO NOTHING;
`;
