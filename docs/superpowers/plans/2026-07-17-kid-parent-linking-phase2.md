# Kid↔Parent Linking — Phase 2 (Device Pairing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a device become *paired* to a parent account — either implicitly when a parent is logged in (Mode A) or by entering the parent's email + 6-digit family PIN (Mode B) — issuing a long-lived, revocable, capability-scoped **device-pairing token**. No kid sign-in yet (Phase 3).

**Architecture:** A new `device_pairings` table holds hashed pairing tokens scoped to an account. `POST /api/pair` issues one (Mode A via the existing parent session, Mode B via email+family-PIN, rate-limited). A `requireDevicePairing` guard authenticates the token for later (Phase 3) kid endpoints. Parents can list and revoke paired devices. All token minting/hashing reuses the existing `tokens.ts`/`rate-limit.ts` helpers.

**Tech Stack:** Cloudflare Pages Functions + D1, WebCrypto tokens (`functions/_lib/auth/tokens.ts`), existing `recordAndCheck` rate limiter, Vitest, React parent UI.

## Global Constraints

- The device-pairing token is **capability-scoped**: it authenticates only future kid-facing endpoints (list kids, kid sign-in). It MUST NOT authenticate any parent-only endpoint (`requireAccount` must reject it). Enforce and test this.
- Tokens are random 256-bit (`generateSessionToken`), stored **only as a SHA-256 hash** (`hashToken`) — never the raw token. Raw token returned to the client once, never logged.
- Mode B (`email` + `pin`) is **rate-limited** via `recordAndCheck` (reuse the login-attempt window mechanism); on too many attempts return 429. Never reveal whether the email or the PIN was wrong — a single generic 401.
- Family PIN verification uses `verifyPassword(pin, pairing_pin_hash, pairing_pin_salt)`; an account with a NULL pairing PIN cannot be paired via Mode B (401).
- Pairing token default lifetime 180 days (`sessionExpiry(now, 180)`); revocable.
- Migration file: `migrations/0005_device_pairings.sql`.

---

## File Structure

- `migrations/0005_device_pairings.sql` — `device_pairings` table.
- `functions/_lib/auth/pairing.ts` — repo (`createDevicePairing`, `findDevicePairing`, `deleteDevicePairing`, `listDevicePairings`) + `authenticatePairing`.
- `functions/_lib/auth/guard.ts` — add `requireDevicePairing`.
- `functions/api/pair/index.ts` — `POST /api/pair` (Mode A + Mode B).
- `functions/api/pair/revoke.ts` — `POST /api/pair/revoke` (parent-only).
- `functions/api/pair/list.ts` — `GET /api/pair/list` (parent-only; paired devices).
- `src/lib/api/client.ts` — `pairDevice`, `pairList`, `pairRevoke`.
- `src/pages/SetupDevice.tsx` — Mode B "Set up this device" screen.
- `src/pages/parent/ParentDevices.tsx` — paired-devices list + revoke.
- Route wiring for the two new pages (match the app's existing router).

---

## Task 1: Migration + pairing repo

**Files:**
- Create: `migrations/0005_device_pairings.sql`, `functions/_lib/auth/pairing.ts`
- Test: `functions/_lib/auth/pairing.test.ts`

**Interfaces:**
- Consumes: `hashToken` (`tokens.ts`), a test DB helper (match `functions/_lib/auth/__testutils__`).
- Produces:
  - `createDevicePairing(db, { tokenHash, accountId, label, createdAt, expiresAt }): Promise<void>`
  - `findDevicePairing(db, tokenHash, now): Promise<{ accountId: string } | null>` (null when missing or expired)
  - `deleteDevicePairing(db, tokenHash, accountId): Promise<void>` (account-scoped)
  - `listDevicePairings(db, accountId): Promise<{ tokenHashPrefix: string; label: string | null; createdAt: string; expiresAt: string }[]>`

- [ ] **Step 1: Write the migration**

```sql
-- migrations/0005_device_pairings.sql
-- Device pairing tokens (design 2026-07-17). A device paired to an account can
-- later list that account's kids and authenticate kid sign-ins — nothing more.
CREATE TABLE device_pairings (
  token_hash  TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label       TEXT,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX idx_device_pairings_account ON device_pairings(account_id);
```

Apply locally: `npx wrangler d1 migrations apply tth-db --local`.

- [ ] **Step 2: Write the failing test** (match the existing `__testutils__` DB harness — see `functions/_lib/auth/repo.test.ts` for the pattern, and include `0005_device_pairings.sql` in the migration list)

```ts
import { describe, it, expect } from 'vitest';
import { createDevicePairing, findDevicePairing, deleteDevicePairing, listDevicePairings } from './pairing';
// reuse the same test-db factory used by repo.test.ts (match its import + migration-list style, adding 0005)

describe('device pairing repo', () => {
  it('stores and finds a live pairing, ignores expired, and scopes delete', async () => {
    const db = await freshDb(); // match the real helper name
    const now = new Date('2026-07-17T10:00:00Z');
    await createAccountFixture(db, 'acc1');   // match how repo.test.ts creates an account
    await createDevicePairing(db, { tokenHash: 'h1', accountId: 'acc1', label: 'iPad', createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString() });
    expect(await findDevicePairing(db, 'h1', now)).toEqual({ accountId: 'acc1' });
    // expired
    const later = new Date(now.getTime() + 2 * 86_400_000);
    expect(await findDevicePairing(db, 'h1', later)).toBeNull();
    // scoped delete: wrong account is a no-op
    await deleteDevicePairing(db, 'h1', 'other');
    expect(await findDevicePairing(db, 'h1', now)).toEqual({ accountId: 'acc1' });
    await deleteDevicePairing(db, 'h1', 'acc1');
    expect(await findDevicePairing(db, 'h1', now)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run functions/_lib/auth/pairing.test.ts`
Expected: FAIL — `./pairing` does not exist.

- [ ] **Step 4: Implement `functions/_lib/auth/pairing.ts`**

```ts
import type { Db } from './types';

export async function createDevicePairing(
  db: Db,
  p: { tokenHash: string; accountId: string; label: string | null; createdAt: string; expiresAt: string },
): Promise<void> {
  await db.prepare(
    'INSERT INTO device_pairings (token_hash, account_id, label, created_at, expires_at) VALUES (?,?,?,?,?)',
  ).bind(p.tokenHash, p.accountId, p.label, p.createdAt, p.expiresAt).run();
}

export async function findDevicePairing(
  db: Db, tokenHash: string, now: Date,
): Promise<{ accountId: string } | null> {
  const row = await db.prepare(
    'SELECT account_id, expires_at FROM device_pairings WHERE token_hash = ?',
  ).bind(tokenHash).first<{ account_id: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  return { accountId: row.account_id };
}

export async function deleteDevicePairing(db: Db, tokenHash: string, accountId: string): Promise<void> {
  await db.prepare('DELETE FROM device_pairings WHERE token_hash = ? AND account_id = ?')
    .bind(tokenHash, accountId).run();
}

export async function listDevicePairings(
  db: Db, accountId: string,
): Promise<{ tokenHashPrefix: string; label: string | null; createdAt: string; expiresAt: string }[]> {
  const { results } = await db.prepare(
    'SELECT token_hash, label, created_at, expires_at FROM device_pairings WHERE account_id = ? ORDER BY created_at DESC',
  ).bind(accountId).all<{ token_hash: string; label: string | null; created_at: string; expires_at: string }>();
  return results.map(r => ({ tokenHashPrefix: r.token_hash.slice(0, 8), label: r.label, createdAt: r.created_at, expiresAt: r.expires_at }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run functions/_lib/auth/pairing.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations/0005_device_pairings.sql functions/_lib/auth/pairing.ts functions/_lib/auth/pairing.test.ts
git commit -m "feat(auth): device_pairings table + repo (create/find/delete/list)"
```

---

## Task 2: `POST /api/pair` (Mode A + Mode B)

**Files:**
- Create: `functions/api/pair/index.ts`
- Test: `functions/api/pair/pair.test.ts`

**Interfaces:**
- Consumes: `requireAccount` (Mode A), `findAccountByEmail` + `verifyPassword` (Mode B), `isValidPin`, `generateSessionToken`/`hashToken`/`sessionExpiry`, `createDevicePairing`, `recordAndCheck`.
- Produces: `POST /api/pair` returns `{ token: string }` (the raw pairing token, once).

- [ ] **Step 1: Write the failing test** (match the request/DB harness used by `functions/api/auth/signup.test.ts`, include migrations 0004 + 0005)

```ts
it('Mode A: an authenticated parent gets a pairing token', async () => {
  const env = await freshEnv();
  const { token: parentSession } = await signup(env, 'p@example.com', 'longenough', '135790'); // reuse real helper
  const res = await onRequestPost(makeCtx({}, env, { authToken: parentSession }));
  expect(res.status).toBe(200);
  const body = await res.json() as { token: string };
  expect(body.token).toBeTruthy();
  // the token authenticates as a device pairing for that account (Phase 3 will use it)
});

it('Mode B: email + correct family PIN gets a pairing token; wrong PIN is 401', async () => {
  const env = await freshEnv();
  await signup(env, 'p2@example.com', 'longenough', '246810');
  const ok = await onRequestPost(makeCtx({ email: 'p2@example.com', pin: '246810' }, env));
  expect(ok.status).toBe(200);
  const bad = await onRequestPost(makeCtx({ email: 'p2@example.com', pin: '999999' }, env));
  expect(bad.status).toBe(401);
});

it('Mode B: an account with no family PIN cannot be paired', async () => {
  const env = await freshEnv();
  await signup(env, 'p3@example.com', 'longenough'); // no pin
  const res = await onRequestPost(makeCtx({ email: 'p3@example.com', pin: '123456' }, env));
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/pair/pair.test.ts`
Expected: FAIL — route does not exist.

- [ ] **Step 3: Implement `functions/api/pair/index.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { authenticate } from '../../_lib/auth/authenticate';
import { findAccountByEmail } from '../../_lib/auth/repo';
import { verifyPassword } from '../../_lib/auth/password';
import { isValidPin, normalizeEmail } from '../../_lib/auth/validation';
import { generateSessionToken, hashToken, sessionExpiry } from '../../_lib/auth/tokens';
import { createDevicePairing } from '../../_lib/auth/pairing';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

// Resolve the account to pair with: Mode A (logged-in parent) or Mode B
// (email + family PIN, rate-limited). Returns the account id, or null to 401.
async function resolveAccount(ctx: { request: Request; env: Env }): Promise<string | null> {
  const now = new Date();
  const account = await authenticate(ctx.request, ctx.env.DB, now); // Mode A
  if (account) return account.id;

  const body = await readJson<{ email?: string; pin?: string }>(ctx.request); // Mode B
  if (!body || typeof body.email !== 'string' || typeof body.pin !== 'string' || !isValidPin(body.pin)) return null;
  const email = normalizeEmail(body.email);
  const allowed = await recordAndCheck(ctx.env.DB, email, now, { maxAttempts: 5, windowMs: 900_000 });
  if (!allowed) return null; // caller maps to 429
  const acct = await findAccountByEmail(ctx.env.DB, email);
  if (!acct || !acct.pairingPinHash || !acct.pairingPinSalt) return null;
  const ok = await verifyPassword(body.pin, acct.pairingPinHash, acct.pairingPinSalt);
  return ok ? acct.id : null;
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const accountId = await resolveAccount(ctx);
  if (!accountId) return error(401, 'unauthorized');
  const token = generateSessionToken();
  const now = new Date();
  await createDevicePairing(ctx.env.DB, {
    tokenHash: await hashToken(token),
    accountId,
    label: ctx.request.headers.get('user-agent')?.slice(0, 120) ?? null,
    createdAt: now.toISOString(),
    expiresAt: sessionExpiry(now, 180),
  });
  return json({ token });
}
```

Note: `findAccountByEmail`'s returned shape must expose `pairingPinHash`/`pairingPinSalt`. If the current `mapAccount` omits them (Task-3 of Phase 1's reviewer noted the mapper ignores those columns), extend the account repo's read to include them — and check no other caller breaks. If the rate limiter's signature differs, match the real `recordAndCheck`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/pair/pair.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/pair/index.ts functions/api/pair/pair.test.ts functions/_lib/auth/repo.ts
git commit -m "feat(auth): POST /api/pair issues a device-pairing token (Mode A + Mode B, rate-limited)"
```

---

## Task 3: `requireDevicePairing` guard + revoke/list endpoints

**Files:**
- Modify: `functions/_lib/auth/guard.ts` (add `requireDevicePairing`), `functions/_lib/auth/pairing.ts` (add `authenticatePairing`)
- Create: `functions/api/pair/revoke.ts`, `functions/api/pair/list.ts`
- Test: `functions/_lib/auth/pairing.test.ts` (guard), `functions/api/pair/revoke.test.ts`

**Interfaces:**
- Produces:
  - `authenticatePairing(request, db, now): Promise<{ accountId: string } | null>` — reads the token via the app's existing `getRequestToken(request)` (confirmed: it reads `Authorization: Bearer <token>` first, then the session cookie), hashes it with `hashToken`, and calls `findDevicePairing`. Because pairing tokens live in `device_pairings` and session tokens in `auth_sessions` (disjoint tables), a pairing token presented to `requireAccount` is looked up in `auth_sessions`, not found, and yields 401 — capability scoping holds with NO change to `requireAccount`/`authenticate`.
  - `requireDevicePairing(request, db): Promise<{ accountId: string } | Response>`.

- [ ] **Step 1: Write the failing test — the guard rejects a parent-only endpoint**

```ts
import { requireDevicePairing } from './guard';
it('requireAccount rejects a device-pairing token (capability scoping)', async () => {
  // Build a request carrying a device-pairing token, assert requireAccount(...) returns a 401 Response,
  // while requireDevicePairing(...) returns { accountId }. This proves the pairing token cannot reach
  // parent-only endpoints. Match the real request/DB harness.
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/_lib/auth/pairing.test.ts -t "capability scoping"`
Expected: FAIL — `requireDevicePairing` not exported.

- [ ] **Step 3: Implement**

Add to `pairing.ts`:

```ts
// in pairing.ts — import getRequestToken from './cookies' and hashToken from './tokens'
export async function authenticatePairing(
  request: Request, db: Db, now: Date,
): Promise<{ accountId: string } | null> {
  const raw = getRequestToken(request);
  if (!raw) return null;
  return findDevicePairing(db, await hashToken(raw), now);
}
```

Add to `guard.ts`:

```ts
import { authenticatePairing } from './pairing';
export async function requireDevicePairing(request: Request, db: Db): Promise<{ accountId: string } | Response> {
  const p = await authenticatePairing(request, db, new Date());
  return p ?? error(401, 'unauthorized');
}
```

Because `authenticate` (used by `requireAccount`) only reads the **session cookie**, a Bearer pairing token is never accepted there — the capability-scoping test passes without changing `requireAccount`. Confirm this against `authenticate.ts`; if `authenticate` also reads Bearer tokens, ensure device-pairing tokens are stored/looked-up in a table `authenticate` does NOT consult (it uses `auth_sessions`, not `device_pairings`, so they are already disjoint).

Then create the endpoints:

```ts
// functions/api/pair/revoke.ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { deleteDevicePairing } from '../../_lib/auth/pairing';
export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  const body = await readJson<{ tokenHash?: string }>(ctx.request);
  if (!body || typeof body.tokenHash !== 'string') return error(400, 'invalid_input');
  await deleteDevicePairing(ctx.env.DB, body.tokenHash, account.id);
  return json({ ok: true });
}
```

```ts
// functions/api/pair/list.ts
import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { listDevicePairings } from '../../_lib/auth/pairing';
export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ devices: await listDevicePairings(ctx.env.DB, account.id) });
}
```

Note: revoke identifies a device by the token-hash prefix returned from `list`; if you prefer a full-hash match, have `list` return an opaque id and revoke by it — keep list/revoke consistent, and never return the raw token.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run functions/_lib/auth/pairing.test.ts functions/api/pair/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/guard.ts functions/_lib/auth/pairing.ts functions/api/pair/revoke.ts functions/api/pair/list.ts functions/api/pair/revoke.test.ts
git commit -m "feat(auth): requireDevicePairing guard + pair list/revoke (capability-scoped)"
```

---

## Task 4: Client + UI (Set up this device, Paired devices)

**Files:**
- Modify: `src/lib/api/client.ts` — `pairDevice`, `pairList`, `pairRevoke`.
- Create: `src/pages/SetupDevice.tsx`, `src/pages/parent/ParentDevices.tsx`; wire routes.
- Test: `src/pages/SetupDevice.test.tsx`, `src/pages/parent/ParentDevices.test.tsx`.

**Interfaces:**
- Consumes: the endpoints from Tasks 2–3.
- Produces (client): `pairDevice(email, pin): Promise<{ token: string }>`, `pairList(): Promise<Device[]>`, `pairRevoke(tokenHash: string): Promise<void>`. The pairing token is stored on the device (localStorage key `tth_pairing_token`) for Phase 3 to consume.

- [ ] **Step 1: Extend the client** — add the three functions (match the existing `apiFetch`/`ApiError` pattern in `client.ts`); `pairDevice` stores the returned token in `localStorage` under `tth_pairing_token`.

- [ ] **Step 2: SetupDevice UI — write the failing test** (`SetupDevice.test.tsx`, matching the parent test render/mock pattern): fill email + 6-digit PIN, submit, assert `pairDevice` called with them and the token stored.

- [ ] **Step 3: SetupDevice UI — implement** `src/pages/SetupDevice.tsx`: a form with email + a 6-digit PIN input (`inputMode="numeric"`, `maxLength={6}`, `autoComplete="off"`, validated `/^\d{6}$/`), calling `pairDevice`; on success show "This device is paired" and (Phase 3 will route to "Who's playing?"). Wire a route (e.g. `/setup-device`).

- [ ] **Step 4: ParentDevices UI — write the failing test** (`ParentDevices.test.tsx`): mock `pairList` to return two devices, assert they render; click Revoke, assert `pairRevoke` called with the right identifier.

- [ ] **Step 5: ParentDevices UI — implement** `src/pages/parent/ParentDevices.tsx`: list paired devices (label + created date) with a Revoke button per row calling `pairRevoke`; add a link from ParentHome ("Paired devices"). Wire the route under `/parent/devices`.

- [ ] **Step 6: Verify**

Run: `npx vitest run src/pages/SetupDevice.test.tsx src/pages/parent/ParentDevices.test.tsx src/lib/api/`
Run: `npx tsc --noEmit`
Expected: PASS + clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/client.ts src/pages/SetupDevice.tsx src/pages/parent/ParentDevices.tsx src/pages/SetupDevice.test.tsx src/pages/parent/ParentDevices.test.tsx
git commit -m "feat(pair): Set up this device (Mode B) + parent Paired devices management"
```

---

## Task 5: Phase verification

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npx vitest run` — all pass.
Run: `npx tsc --noEmit` — clean.
Run: `npm run build` — succeeds; then `grep -rl e2e-oracle dist || echo absent` still `absent` (unrelated guard still holds).

- [ ] **Step 2: Capability-scope guard — explicit end-to-end check**

Confirm a test proves: a device-pairing token presented to a `requireAccount` endpoint yields 401 (it must never reach parent settings). If not already covered by Task 3, add it.

- [ ] **Step 3: Commit any additions**

```bash
git add -A && git commit -m "test(pair): capability-scope + phase 2 verification"
```

---

## Self-Review notes

- **Spec coverage (Phase 2 slice):** device_pairings table + repo → Task 1; `POST /api/pair` Mode A/B + rate limit → Task 2; `requireDevicePairing` + revoke/list + capability scoping → Task 3; client + Set-up-device + Paired-devices UI → Task 4; verification → Task 5. Kid sign-in ("Who's playing?"), kid sessions, and routing practice to the kid are **Phase 3** (separate plan).
- **Security:** tokens hashed at rest; Mode B rate-limited + generic 401; NULL-family-PIN accounts un-pairable; pairing token cannot reach `requireAccount` (explicit test).
- **Type consistency:** `createDevicePairing`/`findDevicePairing`/`deleteDevicePairing`/`listDevicePairings`, `authenticatePairing`, `requireDevicePairing`, `pairDevice`/`pairList`/`pairRevoke`, `tth_pairing_token` used consistently.
- **Known unknowns for the implementer:** exact `__testutils__` DB-factory + account-fixture names; `findAccountByEmail`/`mapAccount` may need extending to expose the pairing PIN hash/salt (Task 2, Step 3 note — Phase-1's reviewer noted `mapAccount` currently ignores those columns); exact `recordAndCheck` signature and return type. (Token transport is resolved: use `getRequestToken`; pairing tokens are in `device_pairings`, disjoint from `auth_sessions`.)
