-- Parent accounts. One account owns many kids and all their data.
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,      -- stored lowercased
  password_hash TEXT NOT NULL,             -- PBKDF2 derived key, base64
  salt          TEXT NOT NULL,             -- per-account random salt, base64
  tz_offset_min INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

-- Login sessions. token_hash = SHA-256 of the opaque session token.
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_auth_sessions_account ON auth_sessions(account_id);

CREATE TABLE kids (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_kids_account ON kids(account_id);

CREATE TABLE practice_sessions (
  id           TEXT PRIMARY KEY,          -- client-generated uuid (idempotent upload)
  kid_id       TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  started_at   TEXT NOT NULL,
  ended_at     TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  module       TEXT NOT NULL,
  correct      INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  topics_json  TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_sessions_kid ON practice_sessions(kid_id, started_at);

CREATE TABLE reward_rules (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kid_id          TEXT REFERENCES kids(id) ON DELETE CASCADE,  -- NULL = applies to all kids
  level1_json     TEXT NOT NULL,
  level2_json     TEXT NOT NULL,
  level3_json     TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_rules_scope ON reward_rules(account_id, IFNULL(kid_id, ''));

CREATE TABLE reward_ledger (
  id           TEXT PRIMARY KEY,
  kid_id       TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  period_type  TEXT NOT NULL,             -- 'day' | 'week' | 'extended'
  period_key   TEXT NOT NULL,             -- e.g. '2026-07-10', '2026-W28', '2026-W28+ext'
  reward_label TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'given'
  earned_at    TEXT NOT NULL,
  given_at     TEXT
);
CREATE UNIQUE INDEX idx_ledger_period ON reward_ledger(kid_id, period_type, period_key);
