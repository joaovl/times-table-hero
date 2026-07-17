-- Kid<->parent PIN model (design 2026-07-17). Columns are nullable so existing
-- accounts/kids keep working until PINs are set.
ALTER TABLE accounts ADD COLUMN pairing_pin_hash TEXT;
ALTER TABLE accounts ADD COLUMN pairing_pin_salt TEXT;
ALTER TABLE kids ADD COLUMN pin_hash TEXT;
ALTER TABLE kids ADD COLUMN pin_salt TEXT;
