# Kid↔Parent Linking — Phase 1 (Schema + PIN setup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the storage and setup surface for the new PIN model — a 6-digit family pairing-PIN at parent signup and a parent-set 6-digit PIN per kid — without changing any sign-in behaviour yet.

**Architecture:** New nullable hashed-PIN columns on `accounts` and `kids` (PBKDF2 + salt, reusing the existing password hasher). The signup endpoint accepts and stores the family PIN; the kids create/edit endpoints accept and store a kid PIN. Client + parent UI gain the fields. Everything stays backward-compatible: PINs are nullable and the app works unchanged before they are set.

**Tech Stack:** Cloudflare Pages Functions + D1 (SQLite), PBKDF2 via WebCrypto (`functions/_lib/auth/password.ts`), Vitest, React parent UI.

## Global Constraints

- A valid PIN is **exactly 6 digits** (`/^\d{6}$/`). Reject anything else with 400 `invalid_input`.
- PINs are hashed with the existing `hashPassword`/`verifyPassword` helpers (PBKDF2 + per-record salt). PINs are NEVER stored, returned, or logged in plaintext. No endpoint ever returns a PIN or its hash.
- New columns are nullable; existing accounts/kids keep working with `NULL` PINs (set lazily later).
- The next migration file is `migrations/0004_kid_pins.sql`.
- No sign-in / pairing behaviour changes in this phase — storage + setup only.

---

## File Structure

- `functions/_lib/auth/validation.ts` — add `isValidPin`.
- `migrations/0004_kid_pins.sql` — add PIN columns.
- `functions/api/auth/signup.ts` — accept/validate/store family PIN.
- `functions/_lib/auth/repo.ts` (or wherever `createAccount` lives) — persist pairing PIN hash/salt.
- `functions/api/kids/index.ts` — accept/validate/store kid PIN on create.
- `functions/api/kids/[id].ts` — accept/validate/store kid PIN on edit (reset).
- `functions/_lib/kids/repo.ts` — persist kid PIN hash/salt.
- `src/lib/api/client.ts` — pass PINs through `authSignup`, kid create/update.
- `src/pages/parent/ParentAuth.tsx` — family-PIN field on the signup form.
- `src/pages/parent/ParentKids.tsx` — kid-PIN field on create/edit.

---

## Task 1: `isValidPin` validation helper

**Files:**
- Modify: `functions/_lib/auth/validation.ts`
- Test: `functions/_lib/auth/validation.test.ts`

**Interfaces:**
- Produces: `isValidPin(pin: string): boolean`.

- [ ] **Step 1: Write the failing test** (append to the existing validation test file)

```ts
import { isValidPin } from './validation';

describe('isValidPin', () => {
  it('accepts exactly six digits', () => {
    expect(isValidPin('012345')).toBe(true);
    expect(isValidPin('999999')).toBe(true);
  });
  it('rejects wrong length or non-digits', () => {
    expect(isValidPin('12345')).toBe(false);   // 5 digits
    expect(isValidPin('1234567')).toBe(false); // 7 digits
    expect(isValidPin('12 45 6')).toBe(false);
    expect(isValidPin('abcdef')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/_lib/auth/validation.test.ts -t isValidPin`
Expected: FAIL — `isValidPin` is not exported.

- [ ] **Step 3: Add the implementation** to `functions/_lib/auth/validation.ts`

```ts
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/_lib/auth/validation.test.ts -t isValidPin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/validation.ts functions/_lib/auth/validation.test.ts
git commit -m "feat(auth): add isValidPin (exactly 6 digits)"
```

---

## Task 2: Migration + family PIN at signup

**Files:**
- Create: `migrations/0004_kid_pins.sql`
- Modify: `functions/api/auth/signup.ts`, and the account-insert repo it calls
- Test: `functions/api/auth/signup.test.ts`

**Interfaces:**
- Consumes: `isValidPin` (Task 1), `hashPassword` (`functions/_lib/auth/password.ts`).
- Produces: signup accepts an optional `pin` field; when present and valid, stores `pairing_pin_hash`/`pairing_pin_salt`; when present and invalid, 400.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/0004_kid_pins.sql
-- Kid<->parent PIN model (design 2026-07-17). Columns are nullable so existing
-- accounts/kids keep working until PINs are set.
ALTER TABLE accounts ADD COLUMN pairing_pin_hash TEXT;
ALTER TABLE accounts ADD COLUMN pairing_pin_salt TEXT;
ALTER TABLE kids ADD COLUMN pin_hash TEXT;
ALTER TABLE kids ADD COLUMN pin_salt TEXT;
```

Apply locally: `npx wrangler d1 migrations apply tth-db --local`
Expected: applies `0004_kid_pins.sql` with no error.

- [ ] **Step 2: Write the failing test** (append to `functions/api/auth/signup.test.ts`, following its existing harness for building a request + test DB)

```ts
it('stores a hashed family pairing PIN when a valid pin is supplied', async () => {
  const env = await freshEnv(); // existing test helper that provisions a D1 with migrations
  const res = await onRequestPost(makeCtx({ email: 'p@example.com', password: 'longenough', pin: '135790' }, env));
  expect(res.status).toBe(200);
  const row = await env.DB.prepare('SELECT pairing_pin_hash, pairing_pin_salt FROM accounts WHERE email = ?')
    .bind('p@example.com').first<{ pairing_pin_hash: string | null; pairing_pin_salt: string | null }>();
  expect(row?.pairing_pin_hash).toBeTruthy();
  expect(row?.pairing_pin_salt).toBeTruthy();
  expect(row?.pairing_pin_hash).not.toBe('135790'); // hashed, not plaintext
});

it('rejects a malformed pin', async () => {
  const env = await freshEnv();
  const res = await onRequestPost(makeCtx({ email: 'q@example.com', password: 'longenough', pin: '12ab' }, env));
  expect(res.status).toBe(400);
});
```

Note: reuse the exact request/context/DB helpers already present at the top of
`signup.test.ts` (do not invent `freshEnv`/`makeCtx` if the file names them
differently — match the file).

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run functions/api/auth/signup.test.ts -t "pairing PIN"`
Expected: FAIL — `pin` is ignored / columns not written.

- [ ] **Step 4: Implement**

In `functions/api/auth/signup.ts`, extend the body type and validation:

```ts
const body = await readJson<{ email?: string; password?: string; tzOffsetMin?: number; pin?: string }>(ctx.request);
```

After the existing email/password validation, before creating the account:

```ts
import { isValidPin } from '../../_lib/auth/validation';
// ...
let pairingPin: { hash: string; salt: string } | null = null;
if (body.pin !== undefined) {
  if (typeof body.pin !== 'string' || !isValidPin(body.pin)) return error(400, 'invalid_input');
  pairingPin = await hashPassword(body.pin);
}
```

Pass `pairingPin` into the account-insert repo call and include the two columns
in the INSERT (defaulting to `null` when `pairingPin` is null). Update the repo
function signature to accept `pairingPinHash: string | null, pairingPinSalt: string | null`
and add them to its INSERT column list.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run functions/api/auth/signup.test.ts`
Expected: PASS (all signup tests, including the new two).

- [ ] **Step 6: Commit**

```bash
git add migrations/0004_kid_pins.sql functions/api/auth/signup.ts functions/_lib/auth/*.ts functions/api/auth/signup.test.ts
git commit -m "feat(auth): store hashed family pairing PIN at signup + PIN columns migration"
```

---

## Task 3: Kid PIN on create and edit

**Files:**
- Modify: `functions/api/kids/index.ts` (POST create), `functions/api/kids/[id].ts` (PUT edit)
- Modify: the kid repo (`functions/_lib/kids/repo.ts`)
- Test: `functions/api/kids/kids.test.ts`

**Interfaces:**
- Consumes: `isValidPin` (Task 1), `hashPassword`.
- Produces: kid create/edit accept an optional `pin`; valid → store `pin_hash`/`pin_salt`; invalid → 400. Kid GET/list responses never include PIN fields.

- [ ] **Step 1: Write the failing test** (append to `functions/api/kids/kids.test.ts`, reusing its existing signup+create helpers)

```ts
it('stores a hashed kid PIN on create and never returns it', async () => {
  const env = await freshEnv();
  const token = await signupAndToken(env, 'p2@example.com'); // reuse existing helper pattern
  const res = await createKidRoute(makeAuthedCtx({ name: 'Sam', color: 'blue', icon: 'star', pin: '246810' }, token, env));
  expect(res.status).toBe(200);
  const created = await res.json() as { kid: { id: string } & Record<string, unknown> };
  expect('pin' in created.kid || 'pin_hash' in created.kid).toBe(false); // no PIN leaks in the response
  const row = await env.DB.prepare('SELECT pin_hash, pin_salt FROM kids WHERE id = ?')
    .bind(created.kid.id).first<{ pin_hash: string | null; pin_salt: string | null }>();
  expect(row?.pin_hash).toBeTruthy();
  expect(row?.pin_hash).not.toBe('246810');
});

it('rejects a malformed kid PIN', async () => {
  const env = await freshEnv();
  const token = await signupAndToken(env, 'p3@example.com');
  const res = await createKidRoute(makeAuthedCtx({ name: 'Sam', color: 'blue', icon: 'star', pin: '99' }, token, env));
  expect(res.status).toBe(400);
});
```

Match the file's real helper names for building an authed context + test DB.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/kids/kids.test.ts -t "kid PIN"`
Expected: FAIL — `pin` ignored / columns not written.

- [ ] **Step 3: Implement**

In `functions/api/kids/index.ts` POST, extend the body type and validate:

```ts
const body = await readJson<{ name?: string; color?: string; icon?: string; pin?: string }>(ctx.request);
// ...existing name/color/icon validation...
import { isValidPin } from '../../_lib/auth/validation';
import { hashPassword } from '../../_lib/auth/password';
let pin: { hash: string; salt: string } | null = null;
if (body?.pin !== undefined) {
  if (typeof body.pin !== 'string' || !isValidPin(body.pin)) return error(400, 'invalid_input');
  pin = await hashPassword(body.pin);
}
```

Pass `pin` into the kid-insert repo (add `pin_hash`, `pin_salt` to the INSERT,
null when absent). Ensure the serialized kid returned to the client contains only
`{ id, name, color, icon, createdAt }` — no PIN fields.

In `functions/api/kids/[id].ts` PUT, accept an optional `pin` the same way and,
when present and valid, `UPDATE kids SET pin_hash = ?, pin_salt = ? WHERE id = ? AND account_id = ?`
(reset). When absent, leave the PIN unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/kids/kids.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api/kids/index.ts functions/api/kids/[id].ts functions/_lib/kids/repo.ts functions/api/kids/kids.test.ts
git commit -m "feat(kids): store hashed per-kid PIN on create/edit (never returned)"
```

---

## Task 4: Client + parent UI for setting PINs

**Files:**
- Modify: `src/lib/api/client.ts` — thread PINs through signup + kid create/update.
- Modify: `src/pages/parent/ParentAuth.tsx` — family-PIN field on signup.
- Modify: `src/pages/parent/ParentKids.tsx` — kid-PIN field on create (and reset on edit).
- Test: `src/pages/parent/ParentAuth.test.tsx`, `src/pages/parent/ParentKids.test.tsx`

**Interfaces:**
- Consumes: the signup/kid endpoints from Tasks 2–3.

- [ ] **Step 1: Extend the client**

In `src/lib/api/client.ts`, update `authSignup` and the kid create/update calls
to accept and send an optional `pin`:

```ts
export function authSignup(email: string, password: string, pin?: string): Promise<AccountInfo> {
  // authCall currently sends { email, password }; extend it (or inline the fetch)
  // to include `pin` in the body only when provided.
}
```

Match the existing `authCall` shape; add `pin` to the POSTed body when defined.
Do the same for the kid-create and kid-update client functions (add an optional
`pin` argument forwarded in the request body).

- [ ] **Step 2: Signup UI — write the failing test** (append to `ParentAuth.test.tsx`, following its render/mock pattern)

```ts
it('sends a 6-digit family PIN on sign up', async () => {
  // render the signup form (reuse the file's existing setup/mocks), fill email,
  // password, and the new "Family PIN" field with '135790', submit, and assert
  // the mocked signup was called with the pin.
  // (Follow the exact query/mocks already used in this test file.)
});
```

- [ ] **Step 3: Signup UI — implement**

Add a labelled 6-digit input (`inputMode="numeric"`, `maxLength={6}`,
`aria-label="Family PIN"`) to the signup branch of `ParentAuth.tsx`, with a
one-line helper: "A 6-digit PIN your kids will use to set up their own device."
Require it on signup (submit disabled / validated to `/^\d{6}$/`), and pass it to
`authSignup(email, password, pin)`.

- [ ] **Step 4: Kids UI — write the failing test** (append to `ParentKids.test.tsx`)

```ts
it('sends a 6-digit PIN when creating a kid', async () => {
  // reuse the file's mocks; fill Name + the new "PIN" field with '246810',
  // click Add kid, assert the mocked create was called with the pin.
});
```

- [ ] **Step 5: Kids UI — implement**

Add a 6-digit PIN input to the add-kid form in `ParentKids.tsx` (label "PIN",
`inputMode="numeric"`, `maxLength={6}`, helper "Your child enters this to pick
their profile."), validate `/^\d{6}$/`, and pass it to the kid-create client call.
Add a "Reset PIN" affordance on each existing kid that calls the update client
function with a new PIN.

- [ ] **Step 6: Run the tests + typecheck**

Run: `npx vitest run src/pages/parent/ParentAuth.test.tsx src/pages/parent/ParentKids.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/client.ts src/pages/parent/ParentAuth.tsx src/pages/parent/ParentKids.tsx src/pages/parent/ParentAuth.test.tsx src/pages/parent/ParentKids.test.tsx
git commit -m "feat(parent): family PIN on signup + per-kid PIN in kid management"
```

---

## Task 5: Phase verification

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npx vitest run` — all unit/function tests pass.
Run: `npx tsc --noEmit` — clean.
Run: `npm run build` — production build succeeds.

- [ ] **Step 2: Backward-compat sanity**

Confirm an existing-style signup WITHOUT a `pin` still returns 200 and creates an
account with `NULL` pairing PIN columns (add/keep a test asserting this), and that
kid create without a `pin` still works with `NULL` kid PIN. This guards the
nullable-migration guarantee.

- [ ] **Step 3: Commit any test additions**

```bash
git add -A
git commit -m "test(auth): backward-compat — signup/kid create without a PIN still works"
```

---

## Self-Review notes

- **Spec coverage (Phase 1 slice):** PIN columns + migration → Task 2; family PIN
  at signup → Task 2; per-kid PIN create/edit → Task 3; validation → Task 1;
  client + UI setup → Task 4; nullable backward-compat → Tasks 2/3/5. Pairing
  tokens, kid sessions, "Who's playing?", and retiring ParentLink are Phases 2–4
  (separate plans), intentionally not here.
- **No PIN leakage:** Tasks 2 and 3 assert hashes are stored (not plaintext) and
  Task 3 asserts kid responses contain no PIN field.
- **Type consistency:** `isValidPin`, `hashPassword`/`verifyPassword`,
  `pairing_pin_hash`/`pairing_pin_salt`, `pin_hash`/`pin_salt` names are used
  consistently across tasks.
- **Known unknowns for the implementer:** exact helper names in
  `signup.test.ts` / `kids.test.ts` (test-DB + authed-context builders) and the
  exact `authCall`/kid-create client shapes — the tasks say to match the real
  files rather than invent names.
