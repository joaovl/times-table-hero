-- Device pairing tokens (design 2026-07-17). A device paired to an account can
-- later list that account's kids and authenticate kid sign-ins -- nothing more.
CREATE TABLE device_pairings (
  token_hash  TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label       TEXT,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX idx_device_pairings_account ON device_pairings(account_id);
