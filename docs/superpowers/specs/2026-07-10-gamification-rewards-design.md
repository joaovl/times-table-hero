# Gamification & Parent Reward System — Design

**Date:** 2026-07-10
**Status:** Draft — awaiting user review
**Author:** joaovl + Claude

## Goal

Add a parent-facing accounts layer to Times Table Hero so a parent can:

- log in with **email + password** across multiple devices,
- manage **two or more kids**, each with their own synced progress,
- configure a **reward system ("the bribe area")** with three levels of rules,
- see a **dashboard** of each kid's progress, streaks, and rewards earned,
- and give kids a **gentle on-screen progress nudge** while practising.

Cross-device sync is a hard requirement (confirmed with the user), so this
introduces a real backend and database for the first time.

## Guiding principle: the account layer is additive and optional

The app today has no accounts and stores everything in the browser. That
free/open/offline character must survive. Therefore:

- **No sign-in →** the app behaves exactly as it does now: local kid picker,
  local per-module progress, full offline, no cloud, no reward system.
- **Signed in →** kids, sessions, rules, and rewards sync to the cloud and the
  bribe area + dashboard appear.

The reward system and dashboard require an account; plain practice never does.
This reconciles "cloud accounts for me" with "free and available to all".

## Architecture

```
React SPA (existing)            Cloudflare Pages Functions            Cloudflare D1
  - kid play works offline  ── fetch /api/* ──►  - self-hosted auth   ──►  SQLite
  - queues sessions in an                        - REST endpoints
    outbox, syncs when online                    - pure reward engine (SoT)
```

- **Backend:** Cloudflare Pages Functions under `functions/api/*`. Deploys with
  the existing Pages build; no separate service.
- **Database:** Cloudflare D1 (SQLite). Schema managed by SQL migrations in
  `migrations/`, applied with `wrangler d1 migrations apply`.
- **Reward engine:** pure TypeScript in `functions/_lib/rewards.ts`, unit-tested
  exhaustively, and run **server-side** as the single source of truth. The same
  types are shared with the client for display.
- **Config:** a `wrangler.toml` is added to declare the D1 binding and a session
  secret. (Today there is none — Pages builds statically.)

## Auth

Self-hosted on Pages Functions + D1 (user's choice), using standard primitives —
no auth framework, no third party.

- **Password hashing:** PBKDF2-HMAC-SHA-256 via WebCrypto (Workers-compatible;
  bcrypt/argon native modules are not). Per-account random salt, high iteration
  count, constant-time comparison.
- **Sessions:** a random 256-bit token stored (hashed) in `auth_sessions` with
  an expiry. Rotated on login, deleted on logout.
- **Transport differs by platform:**
  - **Web/PWA:** token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
  - **Native apps:** a WebView's origin differs from the API origin, so cookies
    are unreliable. Native uses a **Bearer token** in the `Authorization`
    header, stored via `@capacitor/preferences`.
  - The API accepts **either** a valid cookie or a Bearer token.
- **Kids never authenticate.** After the parent signs in on a device, kids are
  chosen from the existing picker (now populated from the account's kids).
- Rate-limit login attempts; generic error messages (no account enumeration).

## Data model (D1)

| Table | Key columns |
|---|---|
| `accounts` | id, email (unique, lowercased), password_hash, salt, created_at |
| `auth_sessions` | token_hash (pk), account_id, expires_at, created_at |
| `kids` | id, account_id, name, color, icon, created_at |
| `practice_sessions` | id, kid_id, started_at, ended_at, duration_sec, module, correct, total, topics_json, created_at |
| `reward_rules` | id, account_id, kid_id (nullable → "all kids"), level1_json, level2_json, level3_json, weak_topics_json, updated_at |
| `reward_ledger` | id, kid_id, period_type (day\|week\|extended), period_key, reward_label, status (pending\|given), earned_at, given_at |

Notes:

- `topics_json` records which tables/skills were practised (e.g. `["mult-7",
  "mult-8"]`) so the engine can apply per-topic ("weak area") requirements.
- `reward_ledger` has a unique constraint on `(kid_id, period_type, period_key)`
  so re-evaluation is idempotent.
- Local `practice_sessions` today capture neither **duration** nor **topics** —
  Phase 4 adds that capture in the modules.

## Reward engine

A pure function evaluated server-side:

```
evaluate(rules, sessions, today) → {
  days:   { date, status: success|missed|pending }[],
  weeklyStreakWeeks: number,
  extendedProgress:  { target: '2weeks'|'month', met: boolean },
  earned: { periodType, periodKey, rewardLabel }[]
}
```

**Level 1 — Daily goal.** A day succeeds when it meets the chosen goal(s) AND the
score requirement:

- Goal: a **time** target (e.g. ≥20 min) and/or an **amount** target. Amount is
  measured in units the app actually tracks online — **exercises answered**
  and/or **sessions completed** (e.g. ≥10 exercises, or ≥2 sessions). Printed
  worksheets ("sheets") are offline and not auto-counted; a later manual
  "mark sheet done" entry is out of scope for now.
- Score requirement, one of: minimum **percent correct** for the day; **average
  across the last N exercises** (N configurable, e.g. 2–3); optionally a
  **stricter requirement on parent-marked weak topics**.

**Level 2 — Weekly streak.** In a 7-day week, earn the weekly reward when
successful days ≥ a parent-set threshold (equivalently, misses ≤ a parent-set
allowance). Editable number.

**Level 3 — Extended streak.** If the weekly goal is met for **2 consecutive
weeks** or for a **whole month** (parent chooses which), unlock a bigger reward.
Toggleable on/off; reward text editable anytime.

All reward labels are **free text** (money, cards, toys, outings). All numbers
are **parent-editable**, never hardcoded.

**Rule-change semantics (edge case):** evaluation always uses the *current*
rules and recomputes history. Changing a rule mid-week re-evaluates that week
predictably. (A future "rules effective from date" is out of scope — YAGNI.)

**Week boundary:** weeks are Monday–Sunday in the account's local timezone,
stored as an offset on the account. (Default to the device timezone at signup.)

## API surface (`functions/api/*`)

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/kids`
- `POST /api/sessions` (batch upload from the outbox), idempotent by client id
- `GET/PUT /api/rules` (per kid or all-kids)
- `GET /api/dashboard?kidId=` (runs the engine; returns days/streaks/rewards)
- `POST /api/rewards/:ledgerId/given`

## Client changes

- `src/lib/api.ts` — typed fetch client; injects cookie (web) or Bearer (native).
- `src/lib/auth/` — React context for parent auth state + guarded `/parent/*`
  routes.
- `src/lib/sync/` — an **outbox**: kid sessions are written locally first, then
  POSTed; retried when back online. Kid play never blocks on the network.
- Parent screens: `/parent` (login/signup), `/parent/kids`, `/parent/rules`
  (bribe area), `/parent/dashboard`, and a rewards checklist with mark-as-given.
- Kid progress nudge: a small, encouraging indicator on the play screen
  ("3 more to reach today's goal", streak flame/star). Never shows discouraging
  deficits.
- **Session capture (Phase 4):** a shared `recordPracticeSession()` called from
  each module's `handleComplete`, capturing `durationSec` (play start→finish)
  and `topics`. Touches all 15 module Index components; capture is centralised so
  each module change is a one-liner.

## Build order (check-in after each phase, per the request)

1. D1 schema + migrations + Functions skeleton + **reward engine (pure, fully
   tested)** — no UI yet.
2. Parent auth (signup/login/logout/me; cookie + bearer; hashing).
3. Reward-rules settings screen (the bribe area) wired to `/api/rules`.
4. Session logging: capture duration + topics in modules; outbox sync to
   `/api/sessions`.
5. Parent dashboard: calendar/list of day outcomes, streak counts, rewards
   checklist + mark-given.
6. Kid-side progress indicator.
7. Testing pass: edge cases (kid misses several days; parent changes rules
   mid-week; timezone boundaries) + Playwright E2E of the full journey.

## Testing

- **Reward engine:** exhaustive vitest — each level, combined goals, weak-topic
  overrides, missed days, mid-week rule changes, week/month boundaries.
- **Auth/API:** integration tests against local D1 via `wrangler`/Miniflare
  (vitest-pool-workers), covering signup/login/session/authorization.
- **Sync:** outbox unit tests (offline queue, retry, idempotency).
- **E2E:** Playwright extends the existing suite: signup → create kid → set
  rules → play as kid → dashboard shows the day → mark reward given. Runs on
  phone + tablet viewports.
- The existing **1613 unit tests stay green**; no regression to the no-account
  path.

## Privacy & compliance (must-do, not optional)

Storing children's practice data and a parent credential in the cloud changes
the current "nothing leaves the device" promise. This design includes:

- A **PRIVACY.md rewrite** describing what is stored (parent email, hashed
  password, kids' first names + practice stats), where (Cloudflare D1), why, and
  how to delete an account and all its data.
- An **account deletion** endpoint that hard-deletes the account, its kids,
  sessions, rules, and ledger.
- No third-party analytics or trackers introduced. Kids' data is minimised to
  what the reward engine needs (no per-question answer content synced — only
  aggregates: correct/total/topics/duration).
- README/marketing copy updated so the "no accounts, nothing leaves the device"
  claim becomes "practice needs no account; the optional parent area syncs the
  data listed in PRIVACY.md".

## Relationship to the native apps

The Android/iOS apps (built on branch `feat/native-mobile-apps`) consume the same
API using **Bearer-token** auth and a configurable API base URL. Wiring native
auth is part of Phase 2/4 but depends on that branch being present; if the apps
are not yet merged, the web path is fully functional on its own and native is a
follow-up.

## Out of scope (YAGNI)

- Multiple parents per household (single account owns the kids).
- Real payments (reward labels are display-only text).
- "Rules effective from date" history versioning.
- Class/teacher/multi-family features or leaderboards.
- Social features, push notifications.

## Prerequisites the user supplies (not code)

- A Cloudflare account with D1 enabled (same account hosting Pages).
- Decision on the production API origin / custom domain for the native apps.
- A session secret (generated and stored as a Pages env var / wrangler secret).
