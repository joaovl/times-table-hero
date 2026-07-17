# Kid↔Parent Linking — Phase 3 (Kid Sign-In) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a paired device, a child taps their name and enters their 6-digit PIN to sign in; their practice then logs straight to their cloud kid — replacing the manual `kidLink` + parent-session requirement that caused bug #15.

**Architecture:** A device-pairing token lists the account's kids (`GET /api/pair/kids`) and authenticates a kid sign-in (`POST /api/kid/signin`, kid PIN verified + rate-limited) which issues a **kid session token** stored in `kid_sessions`. A `requireKid` guard authenticates it. `POST /api/sessions` gains a second auth path: a kid session token attributes practice to that kid (the existing parent-session + body.kidId path stays for backward compat). The client sends the pairing token for kids/sign-in and the kid session token for practice; a new "Who's playing?" screen drives it.

**Tech Stack:** Cloudflare Pages Functions + D1, WebCrypto tokens, `verifyPassword` (PBKDF2), `recordAndCheck` rate limiting, `requireDevicePairing` (Phase 2), Vitest, React.

## Global Constraints

- Kid PIN verified with `verifyPassword(pin, kids.pin_hash, kids.pin_salt)`; a kid with a NULL PIN cannot sign in (401). Rate-limit kid sign-in via `recordAndCheck` keyed `kidsignin:<accountId>:<kidId>` (separate bucket); too many → 429; generic 401 (never reveal whether the kid or PIN was wrong).
- Kid session token random 256-bit, stored ONLY as SHA-256 hash in `kid_sessions`; raw returned once, never logged.
- `GET /api/pair/kids` and `POST /api/kid/signin` authenticate with the **device-pairing token** (`requireDevicePairing`); they return NO PINs.
- `requireKid` authenticates a kid session token via `getRequestToken` → `hashToken` → `kid_sessions` (disjoint from `auth_sessions` and `device_pairings`), so a kid session token can NOT reach parent-only (`requireAccount`) or pairing endpoints.
- `POST /api/sessions` with a kid session token attributes to that kid and IGNORES any body `kidId` (or 400s on mismatch) — a kid session can only write its own kid's practice. The existing parent-session path is unchanged.
- Migration file: `migrations/0006_kid_sessions.sql`.

---

## File Structure

- `migrations/0006_kid_sessions.sql` — `kid_sessions` table.
- `functions/_lib/auth/kidsession.ts` — repo (`createKidSession`, `findKidSession`, `deleteKidSession`) + `authenticateKid`.
- `functions/_lib/auth/guard.ts` — add `requireKid`.
- `functions/api/pair/kids.ts` — `GET /api/pair/kids` (device-pairing auth → kid list).
- `functions/api/kid/signin.ts` — `POST /api/kid/signin` (device-pairing auth + kid PIN → kid session).
- `functions/api/sessions/index.ts` — accept a kid session token as a second auth path.
- `src/lib/api/client.ts` — `pairKids`, `kidSignin`, kid-session store, per-call token selection for practice logging.
- `src/lib/practice/recordPractice.ts` — attribute to the signed-in kid session when present.
- `src/pages/WhosPlaying.tsx` — kid grid + PIN pad sign-in; "Switch player".
- Route wiring for `/play` entry / `WhosPlaying`.

---

## Task 1: `kid_sessions` migration + repo + guard

**Files:**
- Create: `migrations/0006_kid_sessions.sql`, `functions/_lib/auth/kidsession.ts`
- Modify: `functions/_lib/auth/guard.ts`
- Test: `functions/_lib/auth/kidsession.test.ts`

**Interfaces:**
- Produces:
  - `createKidSession(db, { tokenHash, kidId, accountId, createdAt, expiresAt }): Promise<void>`
  - `findKidSession(db, tokenHash, now): Promise<{ kidId: string; accountId: string } | null>` (null when missing/expired)
  - `deleteKidSession(db, tokenHash): Promise<void>`
  - `authenticateKid(request, db, now): Promise<{ kidId: string; accountId: string } | null>` (via `getRequestToken` + `hashToken`)
  - `requireKid(request, db): Promise<{ kidId: string; accountId: string } | Response>`

- [ ] **Step 1: Migration**

```sql
-- migrations/0006_kid_sessions.sql
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
```

Apply locally: `npx wrangler d1 migrations apply tth-db --local`.

- [ ] **Step 2: Failing test** (match the `__testutils__` DB factory + account/kid fixtures used by `pairing.test.ts`; include migrations through 0006). Cover: create+find live; expired→null; `requireKid` returns `{kidId,accountId}` for a kid token AND `requireAccount` returns a 401 Response for that same kid token (capability scoping).

```ts
import { createKidSession, findKidSession, requireKidHelpersExportCheck } from './kidsession';
// (write real assertions per the interfaces above, mirroring pairing.test.ts style)
```

- [ ] **Step 3: Run → FAIL.** `npx vitest run functions/_lib/auth/kidsession.test.ts`

- [ ] **Step 4: Implement `functions/_lib/auth/kidsession.ts`**

```ts
import type { Db } from './types';
import { getRequestToken } from './cookies';
import { hashToken } from './tokens';

export async function createKidSession(
  db: Db, s: { tokenHash: string; kidId: string; accountId: string; createdAt: string; expiresAt: string },
): Promise<void> {
  await db.prepare(
    'INSERT INTO kid_sessions (token_hash, kid_id, account_id, created_at, expires_at) VALUES (?,?,?,?,?)',
  ).bind(s.tokenHash, s.kidId, s.accountId, s.createdAt, s.expiresAt).run();
}

export async function findKidSession(
  db: Db, tokenHash: string, now: Date,
): Promise<{ kidId: string; accountId: string } | null> {
  const row = await db.prepare(
    'SELECT kid_id, account_id, expires_at FROM kid_sessions WHERE token_hash = ?',
  ).bind(tokenHash).first<{ kid_id: string; account_id: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  return { kidId: row.kid_id, accountId: row.account_id };
}

export async function deleteKidSession(db: Db, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM kid_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function authenticateKid(
  request: Request, db: Db, now: Date,
): Promise<{ kidId: string; accountId: string } | null> {
  const raw = getRequestToken(request);
  if (!raw) return null;
  return findKidSession(db, await hashToken(raw), now);
}
```

Add to `guard.ts`:

```ts
import { authenticateKid } from './kidsession';
export async function requireKid(request: Request, db: Db): Promise<{ kidId: string; accountId: string } | Response> {
  const k = await authenticateKid(request, db, new Date());
  return k ?? error(401, 'unauthorized');
}
```

`authenticate` (used by `requireAccount`) looks up `auth_sessions` only, so a kid token never satisfies it — capability scoping holds with no change to `requireAccount`.

- [ ] **Step 5: Run → PASS.** Commit: `feat(auth): kid_sessions table + repo + requireKid guard (capability-scoped)`.

---

## Task 2: `GET /api/pair/kids`

**Files:** Create `functions/api/pair/kids.ts`; Test `functions/api/pair/kids.test.ts`.

**Interfaces:** Consumes `requireDevicePairing`, `listKids`/`serializeKid`. Produces `GET /api/pair/kids` → `{ kids: [{id,name,color,icon}] }` (no PINs).

- [ ] **Step 1: Failing test** (match the pair test harness; pair a device via `POST /api/pair` Mode B to get a pairing token, create a kid, then GET /api/pair/kids with the pairing token → the kid appears, no `pin`/`pin_hash`). Also assert a request WITHOUT a pairing token → 401.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireDevicePairing } from '../../_lib/auth/guard';
import { listKids } from '../../_lib/kids/repo';        // match the real list fn name
import { serializeKid } from '../../_lib/kids/serialize';
export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const p = await requireDevicePairing(ctx.request, ctx.env.DB);
  if (p instanceof Response) return p;
  const kids = await listKids(ctx.env.DB, p.accountId);
  return json({ kids: kids.map(serializeKid) });
}
```

Match the real kid-list repo function name/signature (read `functions/_lib/kids/repo.ts`).

- [ ] **Step 4: Run → PASS.** Commit: `feat(pair): GET /api/pair/kids lists the account's kids for a paired device`.

---

## Task 3: `POST /api/kid/signin`

**Files:** Create `functions/api/kid/signin.ts`; Test `functions/api/kid/signin.test.ts`.

**Interfaces:** Consumes `requireDevicePairing`, `getKid`, `verifyPassword`, `isValidPin`, `recordAndCheck`, token helpers, `createKidSession`. Produces `POST /api/kid/signin` body `{ kidId, pin }` → `{ token }` (kid session).

- [ ] **Step 1: Failing test** — correct kid PIN → 200 + token; wrong PIN → 401; kid with NULL PIN → 401; kid belonging to a different account than the pairing → 404/401; no pairing token → 401.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireDevicePairing } from '../../_lib/auth/guard';
import { getKidWithPin } from '../../_lib/kids/repo';   // may need a repo read that exposes pin_hash/salt (additive)
import { verifyPassword } from '../../_lib/auth/password';
import { isValidPin } from '../../_lib/auth/validation';
import { generateSessionToken, hashToken, sessionExpiry } from '../../_lib/auth/tokens';
import { createKidSession } from '../../_lib/auth/kidsession';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const p = await requireDevicePairing(ctx.request, ctx.env.DB);
  if (p instanceof Response) return p;
  const body = await readJson<{ kidId?: string; pin?: string }>(ctx.request);
  if (!body || typeof body.kidId !== 'string' || typeof body.pin !== 'string' || !isValidPin(body.pin)) {
    return error(401, 'unauthorized');
  }
  const now = new Date();
  if ((await recordAndCheck(ctx.env.DB, `kidsignin:${p.accountId}:${body.kidId}`, now)).blocked) {
    return error(429, 'too_many_attempts');
  }
  const kid = await getKidWithPin(ctx.env.DB, p.accountId, body.kidId); // account-scoped read incl. pin_hash/salt
  // Constant-time-ish: verify against a dummy when kid/pin missing to avoid enumeration.
  const hash = kid?.pinHash ?? 'x'; const salt = kid?.pinSalt ?? 'x';
  const ok = await verifyPassword(body.pin, hash, salt);
  if (!kid || !kid.pinHash || !kid.pinSalt || !ok) return error(401, 'unauthorized');
  const token = generateSessionToken();
  await createKidSession(ctx.env.DB, {
    tokenHash: await hashToken(token), kidId: kid.id, accountId: p.accountId,
    createdAt: now.toISOString(), expiresAt: sessionExpiry(now, 30),
  });
  return json({ token });
}
```

If `getKidWithPin` doesn't exist, add an account-scoped repo read that returns `{ id, pinHash, pinSalt }` (additive; the normal `getKid`/serialized reads must keep omitting the PIN). Match `verifyPassword`'s dummy-hash constant-time pattern used in `login.ts`/`pair`.

- [ ] **Step 4: Run → PASS.** Commit: `feat(kid): POST /api/kid/signin issues a kid session (PIN verified, rate-limited)`.

---

## Task 4: `POST /api/sessions` accepts a kid session token

**Files:** Modify `functions/api/sessions/index.ts`; Test `functions/api/sessions/sessions.test.ts`.

**Interfaces:** Adds a kid-session auth path: when a kid session token is present, attribute practice to that kid; ignore/enforce body `kidId`.

- [ ] **Step 1: Failing test** — with a kid session token, `POST /api/sessions` with `{ sessions:[...] }` (no kidId, or a matching kidId) → 201 and the rows are attributed to that kid; a mismatched body `kidId` → 400/ignored; a kid session token can NOT write another kid's practice.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — at the top of `onRequestPost`, try `authenticateKid(ctx.request, ctx.env.DB, new Date())`; if a kid session is present, set `kidId = kidSession.kidId` (and if `body.kidId` is present and differs, return 400 `kid_mismatch`), skip the `requireAccount` path, validate the sessions array, and `insertSessions(db, kidId, sessions)`. Otherwise fall through to the EXISTING parent-session + `body.kidId` + `getKid` path unchanged.

- [ ] **Step 4: Run → PASS** (`npx vitest run functions/api/sessions/ functions`). Commit: `feat(sessions): attribute practice via a kid session token (kid can only write its own)`.

---

## Task 5: Client — kid sign-in + practice attribution

**Files:** Modify `src/lib/api/client.ts`, `src/lib/practice/recordPractice.ts`; Test `src/lib/api/client.kid.test.ts`, `recordPractice` test.

**Interfaces:**
- `pairKids(): Promise<Array<{id,name,color,icon}>>` — GET /api/pair/kids with the **pairing token**.
- `kidSignin(kidId, pin): Promise<void>` — POST /api/kid/signin with the pairing token; stores the returned kid session token under `tth_kid_token`; also store the current kid `{id,name,...}` for the UI.
- `kidSignout(): void` — clears `tth_kid_token` + current kid.
- `currentKid(): {id,name,...} | null`.

- [ ] **Step 1** — extend `apiFetch` (or add a variant) so a call can send an explicit bearer token: pairing token for `pairKids`/`kidSignin`, the kid token for practice. Read the real `apiFetch` first and keep existing calls (parent session) unchanged.

- [ ] **Step 2 (TDD)** — tests assert `pairKids`/`kidSignin` send the pairing token and store the kid token; `recordPractice` uploads via the kid token when signed in.

- [ ] **Step 3** — `recordPractice`: when a kid session token exists (`tth_kid_token`), enqueue/upload with the kid token and the current kid's id (no `kidLink` needed); keep the legacy `kidLink` + parent-token path as a fallback for the transition. Update `sessionsLog` to send the kid token when present.

- [ ] **Step 4: Run → PASS + `npx tsc --noEmit`.** Commit: `feat(client): kid sign-in + route practice logging through the kid session`.

---

## Task 6: "Who's playing?" UI

**Files:** Create `src/pages/WhosPlaying.tsx` (+ route); wire the play entry to it; Test `src/pages/WhosPlaying.test.tsx`.

- [ ] **Step 1 (TDD)** — mock `pairKids` → two kids; render the grid; tap a kid; enter a 6-digit PIN (`inputMode="numeric"`, `maxLength={6}`, `autoComplete="off"`); assert `kidSignin(kidId, pin)` is called; on success the child proceeds to play. Wrong PIN shows an error. A "Switch player" control calls `kidSignout` and returns to the grid.

- [ ] **Step 2** — implement `WhosPlaying.tsx`: fetch kids via `pairKids` (needs a paired device — if none, link to `/setup-device`); a name/avatar grid; on tap show a PIN pad; call `kidSignin`; on success store the current kid and route into play. Add a small "Switch player" affordance in the play header (or menu) that signs the kid out. Wire the route so a paired device lands on "Who's playing?" as its play entry.

- [ ] **Step 3: Run → PASS + tsc clean.** Commit: `feat(play): "Who's playing?" kid sign-in screen on a paired device`.

---

## Task 7: Verification

- [ ] **Step 1** — `npx vitest run` (all pass), `npx tsc --noEmit` (clean), `npm run build` (succeeds), `grep -rl e2e-oracle dist || echo absent` → `absent`.
- [ ] **Step 2 — capability scoping end-to-end:** confirm tests prove a **kid session token** presented to `requireAccount` (parent) AND to `requireDevicePairing` endpoints both yield 401 (a kid token is neither a parent nor a pairing credential). Add focused tests if missing.
- [ ] **Step 3** — commit any test additions: `test(kid): phase 3 verification + cross-credential capability scoping`.

---

## Self-Review notes

- **Spec coverage (Phase 3 slice):** kid_sessions + requireKid → Task 1; list kids for a paired device → Task 2; kid sign-in (PIN, rate-limited) → Task 3; practice attribution via kid session → Task 4; client sign-in + logging → Task 5; "Who's playing?" UI → Task 6; verification → Task 7. Retiring the manual `kidLink`/ParentLink page is **Phase 4** (kept as a fallback here).
- **Security:** kid PIN hashed-verify + rate-limited + generic 401; kid session token hashed at rest; kid session cannot reach parent or pairing endpoints (disjoint tables, explicit tests); a kid session can only write its own kid's practice.
- **Type consistency:** `createKidSession`/`findKidSession`/`deleteKidSession`/`authenticateKid`/`requireKid`, `pairKids`/`kidSignin`/`kidSignout`/`currentKid`, `tth_kid_token` used consistently.
- **Known unknowns for implementer:** real kid-list repo fn name; whether an account-scoped `getKidWithPin` read exists or must be added (additive, must not leak PIN elsewhere); the app's play-entry routing (where to mount "Who's playing?"); the real `apiFetch` shape for per-call token selection.
