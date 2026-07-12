-- Feedback / bug reports raised by grown-ups from the app. Open intake (no
-- account required); resolution is written back by the maintainer's tooling.
CREATE TABLE bugs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  context_json  TEXT,                              -- recent attempts + route + version
  url           TEXT,
  reporter      TEXT,                              -- optional; parent email when signed in
  severity      TEXT NOT NULL DEFAULT 'medium',    -- low | medium | high
  status        TEXT NOT NULL DEFAULT 'open'       -- open | fixed | wontfix
                CHECK (status IN ('open','fixed','wontfix')),
  created_at    TEXT NOT NULL,
  resolution_md TEXT,
  resolved_at   TEXT
);
CREATE INDEX idx_bugs_status ON bugs(status);
