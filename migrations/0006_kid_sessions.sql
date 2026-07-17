-- Kid sign-in sessions (design 2026-07-17). Scoped to one kid; can log that
-- kid's practice and read its own progress. Disjoint from auth_sessions and
-- device_pairings.
CREATE TABLE kid_sessions (
  token_hash  TEXT PRIMARY KEY,
  kid_id      TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX idx_kid_sessions_kid ON kid_sessions(kid_id);
