-- Database schema for NegotiateAI (PostgreSQL 13+)
CREATE TABLE IF NOT EXISTS negotiations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email      TEXT        NOT NULL,
  scenario_id     TEXT        NOT NULL,
  scenario_title  TEXT        NOT NULL,
  status          TEXT        NOT NULL CHECK (status IN ('settled', 'impasse')),
  agreement_score INTEGER     NOT NULL DEFAULT 0,
  agents          JSONB       NOT NULL,
  turns           JSONB       NOT NULL,
  settlement      JSONB       NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiations_user_created
  ON negotiations (user_email, created_at DESC);
