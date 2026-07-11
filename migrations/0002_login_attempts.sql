-- Fixed-window login throttle. One row per (email, window_start); the app
-- increments count and compares against the limit.
CREATE TABLE login_attempts (
  email        TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (email, window_start)
);
