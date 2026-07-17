# Kid↔Parent Identity & Device Pairing — Design

Date: 2026-07-17
Status: Approved (design); pending implementation plan
Motivating bug: #15 (kid↔parent linking is unclear/broken), also relieves #5.

## Motivation

Today the app has two parallel concepts that a parent must manually reconcile:

- **Local players** — device-local avatars a child picks to play; no login, works
  account-free and offline (`src/lib/userStorage.ts`).
- **Cloud kids** — records a parent creates in their account (`kids` table).

Linking is a manual, per-device `localStorage` map from local player → cloud kid
(`src/lib/practice/kidLink.ts`, surfaced on the `/parent/link` page: "do this
once per device"). Parents find this confusing and broken (#15): there is no kid
identity that travels — just a fragile local mapping between two things that look
like the same child, and it silently fails to attach practice to the right kid.

This design replaces manual linking with a real, parent-scoped **kid sign-in**:
the child authenticates as themselves with a 6-digit PIN on a device that is
paired to their parent's account, and practice logs straight to their cloud kid.

## Identity model

- A **kid** is created inside a parent account, so identity is scoped to the
  parent — a kid PIN only needs to be unique within one family, not globally
  (this resolves the "many kids pick the same PIN" collision concern).
- Each kid has a parent-set **6-digit kid PIN** used to pick who is playing on a
  paired device.
- The account has one **6-digit family pairing-PIN**, set at signup, used only to
  attach a kid's own device to the account (Mode B below).
- Account-free local play is preserved unchanged as a separate "Just play" path.

## Data model (D1)

Existing (unchanged) relevant tables: `accounts(id, email, password_hash, salt,
tz_offset_min, created_at)`, `kids(id, account_id, name, color, icon,
created_at)`, `auth_sessions(token_hash, account_id, expires_at, created_at)`,
`login_attempts(email, window_start, count)`.

Migration `0007_kid_pins.sql` adds:

- `accounts.pairing_pin_hash TEXT` and `accounts.pairing_pin_salt TEXT`
  (nullable until the parent sets a family PIN — see Backward compatibility).
- `kids.pin_hash TEXT` and `kids.pin_salt TEXT` (nullable until set).
- New table `device_pairings`:
  ```sql
  CREATE TABLE device_pairings (
    token_hash  TEXT PRIMARY KEY,
    account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    label       TEXT,                 -- optional device label / user-agent hint
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL         -- long-lived (e.g. 180 days), revocable
  );
  CREATE INDEX idx_device_pairings_account ON device_pairings(account_id);
  ```
- New table `kid_sessions`:
  ```sql
  CREATE TABLE kid_sessions (
    token_hash  TEXT PRIMARY KEY,
    kid_id      TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
    account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX idx_kid_sessions_kid ON kid_sessions(kid_id);
  ```

All PINs are hashed with the existing PBKDF2 + per-record-salt scheme (the same
helper the account password uses); PINs are never stored or logged in plaintext.

## Token model & privilege scoping

Three credential types, least-privilege:

1. **Parent session** (existing `auth_sessions`) — full access: settings,
   rewards, kid management, device revocation.
2. **Device-pairing token** (`device_pairings`) — scoped to an account with a
   *narrow* capability set: list that account's kids and authenticate kid
   sign-ins. It CANNOT read/write rewards or settings, add/delete kids, or change
   account details. Long-lived, revocable by the parent.
3. **Kid session** (`kid_sessions`) — scoped to one kid: log practice for that
   kid and read that kid's own progress. No parent-area access.

Guards live alongside the existing `requireAccount` guard: `requireDevicePairing`
and `requireKid`.

## Flows

### Parent signup (extended)
Signup form gains a **6-digit family PIN** field (with confirm). Server stores
`pairing_pin_hash`/`pairing_pin_salt`. (Password rules unchanged.)

### Kid creation / edit (ParentKids)
When adding or editing a kid, the parent sets/reset a **6-digit kid PIN**. Server
stores `kids.pin_hash`/`kids.pin_salt`. Parent can reset any kid's PIN.

### Mode A — shared device (parent logs in)
Parent logs in normally (email + password). The device is paired via the parent
session; the app issues a device-pairing token so kids can keep playing after the
parent session expires. The app then shows the **"Who's playing?"** screen.

### Mode B — kid's own device (no parent login)
"Set up this device" → enter **parent email + 6-digit family PIN** → server
verifies (rate-limited via `login_attempts`) and issues a **device-pairing
token** stored on the device. Then the **"Who's playing?"** screen.

### Kid sign-in ("Who's playing?")
On a paired device, a name/avatar grid lists the account's kids. The child taps
their name and enters their **6-digit kid PIN**. Server verifies the PIN against
that kid under the paired account (rate-limited) and issues a **kid session**.
Practice now logs to that cloud kid (replaces the `kidLink` map).

### Switch kid / sign out
"Switch player" clears the kid session and returns to "Who's playing?". The
parent can **revoke paired devices** from their area (deletes `device_pairings`
rows), forcing re-pairing.

### Account-free play
A "Just play (no account)" path keeps today's local-avatar behaviour untouched
for families who don't want an account.

## API (Pages Functions)

- `POST /api/auth/signup` — extended to accept and store the family PIN.
- `POST /api/kids` / `PUT /api/kids/:id` — accept a kid PIN (set/reset).
- `POST /api/pair` — body `{ email, pin }` (Mode B) OR authenticated parent
  session (Mode A) → returns a device-pairing token. Rate-limited.
- `GET /api/pair/kids` — device-pairing-token auth → list `{ id, name, color,
  icon }` for the account's kids (no PINs, no settings).
- `POST /api/kid/signin` — device-pairing-token auth + `{ kidId, pin }` → kid
  session token. Rate-limited.
- `POST /api/pair/revoke` — parent-session auth → revoke a device pairing.
- `POST /api/sessions` (practice logging) — accepts a **kid session** token and
  attributes to that kid; the client stops using `kidLink`.

## UI

- **Parent signup**: add the family-PIN field.
- **ParentKids**: per-kid PIN set/reset control.
- **"Set up this device"** screen (Mode B): email + family PIN.
- **"Who's playing?"** screen: kid grid + PIN pad; becomes the entry point on a
  paired device; "Switch player" control during/after play.
- **Parent area**: "Paired devices" list with revoke.
- **Retire** `/parent/link` (ParentLink) and the `kidLink` localStorage map once
  migration is complete.

## Backward compatibility & migration

- Existing accounts have `pairing_pin_hash = NULL` and existing kids have
  `pin_hash = NULL`. On the next **parent login**, if the family PIN is unset,
  prompt the parent to set it; when they open ParentKids, prompt to set any
  missing kid PINs. Nothing breaks in the meantime — the parent area works as
  today.
- While a device still has legacy `kidLink` entries and no kid session, honour
  them for practice attribution during the transition, then remove `ParentLink`
  and the `kidLink` module.
- Account-free local play is unchanged throughout.

## Security notes

- PINs hashed (PBKDF2 + salt); never plaintext at rest or in logs.
- Mode B pairing and kid sign-in are rate-limited through the existing
  `login_attempts` window mechanism (keyed by email for pairing, by
  account+kid for sign-in) to make 6-digit brute force infeasible.
- Device-pairing tokens and kid sessions are narrowly scoped and revocable;
  neither can reach the parent settings surface.
- A device-pairing token leak exposes only "list kids + attempt kid PINs"
  (still rate-limited), never account settings or the ability to change rewards.

## Out of scope (explicitly)

- Kid-owned email/password accounts.
- Cross-parent kid sharing / co-parents.
- Biometric or OS-level auth.
- Changing the reward/goal model (that is #6/#13/#17 work).

## Phasing (each phase ships independently)

1. **Schema + PIN setup** — migration; family PIN at signup; per-kid PIN in
   ParentKids; hashing helpers and guards.
2. **Device pairing (A + B)** — `/api/pair*` endpoints, pairing token, "Set up
   this device" screen, parent "Paired devices" + revoke.
3. **Kid sign-in** — `/api/pair/kids`, `/api/kid/signin`, kid sessions, the
   "Who's playing?" screen, and routing practice logging to the kid session.
4. **Migration + retire manual linking** — one-time PIN prompts; honour legacy
   `kidLink` during transition; remove ParentLink + kidLink.

## Risks & mitigations

- *6-digit brute force* → server-side rate limiting + lockout via
  `login_attempts`; hashed comparison; never reveal which of email/PIN was wrong.
- *Migration friction for existing families* → PINs are nullable and prompted
  lazily; the app keeps working before PINs are set; legacy links honoured during
  transition.
- *Scope creep of the pairing token* → capability-scoped guards enforced
  server-side; explicit tests that a pairing token is rejected on parent-only
  endpoints.
- *Losing account-free play* → preserved as a first-class "Just play" path,
  covered by a regression test.
