-- user_db — email verification (Task 2)
-- Adds email_verified_at to users and a separate email_verifications table
-- so we can issue/expire/replace tokens without mutating the user row.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS email_verifications_token_idx ON email_verifications (token);
CREATE INDEX IF NOT EXISTS email_verifications_user_idx ON email_verifications (user_id);
CREATE INDEX IF NOT EXISTS email_verifications_expires_idx ON email_verifications (expires_at);
