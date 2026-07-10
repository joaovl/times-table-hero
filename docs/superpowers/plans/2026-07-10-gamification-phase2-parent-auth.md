# Gamification Phase 2 — Parent Authentication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-hosted parent email+password authentication as Cloudflare Pages Functions over the Phase 1 D1 schema — signup, login, logout, `me`, and an `authenticate()` helper — with passwords hashed (PBKDF2) and sessions carried by an HttpOnly cookie (web) or a Bearer token (native).

**Architecture:** All crypto, validation, token, and cookie logic lives in small pure modules under `functions/_lib/auth/` and is unit-tested in plain node Vitest. A thin D1 repository does the SQL; HTTP handlers under `functions/api/auth/` glue request→repo→response. D1-backed code is integration-tested against an in-memory SQLite (`node:sqlite`) wrapped to present D1's async `prepare().bind().first()/run()/all()` surface, so no Cloudflare runtime is needed in tests.

**Tech Stack:** TypeScript, Cloudflare Pages Functions, D1 (prod) / `node:sqlite` (tests), WebCrypto (PBKDF2, SHA-256), Vitest.

## Global Constraints

- Passwords are NEVER stored or logged in plaintext. Hash = PBKDF2-HMAC-SHA-256, **100000 iterations**, **16-byte** random salt, **32-byte** derived key; hash and salt stored **base64**.
- Session token: **32 random bytes**, presented to the client as **base64url**; only its **SHA-256 (base64)** is stored in `auth_sessions.token_hash`. Never store the raw token.
- Session cookie name is **`tth_session`**; attributes: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<seconds>`. Session lifetime = **30 days**.
- The API accepts a session via **either** the `tth_session` cookie **or** an `Authorization: Bearer <token>` header. Native clients use the Bearer form.
- Email is normalized to **trimmed + lowercased** before storage/lookup. Password policy: **minimum 8 characters**.
- Login and signup return **generic** errors that do not reveal whether an email exists (no account enumeration). Invalid credentials → HTTP **401** with body `{"error":"invalid_credentials"}`. Duplicate signup email → HTTP **409** `{"error":"email_taken"}` (this is unavoidable for signup UX and is acceptable per spec; login must stay generic).
- All engine/auth logic stays framework-free and testable; do NOT introduce an auth library.
- New files only under `functions/`; do not touch the no-account local app path or Phase 1 engine files.
- IDs (`accounts.id`, `auth_sessions` rows use token_hash as PK) are generated with `crypto.randomUUID()`.
- "Now" is passed into any time-dependent function as an argument (testability); handlers pass `new Date()`.

---

### Task 1: Foundations — deps, types, HTTP helpers, and the test D1 adapter

**Files:**
- Modify: `package.json` (devDependency + no new scripts needed)
- Create: `functions/_lib/auth/types.ts`
- Create: `functions/_lib/http.ts`
- Create: `functions/_lib/auth/__testutils__/testdb.ts`
- Test: `functions/_lib/auth/__testutils__/testdb.test.ts`

**Interfaces:**
- Consumes: the Phase 1 migration at `migrations/0001_init.sql`.
- Produces:
  - `Account` = `{ id: string; email: string; passwordHash: string; salt: string; tzOffsetMin: number; createdAt: string }`.
  - `Env` = `{ DB: Db }`.
  - `Db` (minimal async D1 subset): `prepare(sql: string): Stmt`; `Stmt.bind(...a: unknown[]): Stmt`; `Stmt.first<T>(): Promise<T | null>`; `Stmt.run(): Promise<{ success: boolean }>`; `Stmt.all<T>(): Promise<{ results: T[] }>`.
  - `json(data: unknown, init?: ResponseInit): Response`, `error(status: number, code: string, extraHeaders?: HeadersInit): Response`, `readJson<T>(request: Request): Promise<T | null>`.
  - `createTestDb(migrationPaths: string[]): Db` — an in-memory `node:sqlite` DB exposing the `Db` interface.

- [ ] **Step 1: Install Cloudflare types**

Run: `npm install -D @cloudflare/workers-types`
Expected: added to devDependencies.

- [ ] **Step 2: Write `functions/_lib/auth/types.ts`**

```ts
// Minimal async subset of the D1 API our repo uses. Cloudflare's real
// D1Database satisfies this structurally; the test adapter implements it over
// node:sqlite. Keeping our own interface (instead of importing D1Database)
// keeps the repo unit-testable without the Workers runtime.
export interface Stmt {
  bind(...args: unknown[]): Stmt;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}
export interface Db {
  prepare(sql: string): Stmt;
}

export interface Env {
  DB: Db;
}

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  tzOffsetMin: number;
  createdAt: string;
}
```

- [ ] **Step 3: Write `functions/_lib/http.ts`**

```ts
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', JSON_HEADERS['content-type']);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status: number, code: string, extraHeaders?: HeadersInit): Response {
  return json({ error: code }, { status, headers: extraHeaders });
}

/** Parse a JSON request body; returns null on malformed/empty bodies. */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Write the test adapter `functions/_lib/auth/__testutils__/testdb.ts`**

```ts
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { Db, Stmt } from '../types';

// node:sqlite prints a one-time ExperimentalWarning; silence just that line so
// integration-test output stays pristine.
const originalEmit = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const msg = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (msg.includes('SQLite is an experimental feature')) return;
  return (originalEmit as (w: string | Error, ...r: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

function stmt(db: DatabaseSync, sql: string, bound: unknown[]): Stmt {
  return {
    bind(...args: unknown[]): Stmt {
      return stmt(db, sql, args);
    },
    async first<T = unknown>(): Promise<T | null> {
      const row = db.prepare(sql).get(...(bound as never[]));
      return (row ?? null) as T | null;
    },
    async run(): Promise<{ success: boolean }> {
      db.prepare(sql).run(...(bound as never[]));
      return { success: true };
    },
    async all<T = unknown>(): Promise<{ results: T[] }> {
      const rows = db.prepare(sql).all(...(bound as never[]));
      return { results: rows as T[] };
    },
  };
}

export function createTestDb(migrationPaths: string[]): Db {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const p of migrationPaths) db.exec(readFileSync(p, 'utf8'));
  return {
    prepare(sql: string): Stmt {
      return stmt(db, sql, []);
    },
  };
}
```

- [ ] **Step 5: Write the failing test `functions/_lib/auth/__testutils__/testdb.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './testdb';

const MIGRATION = resolve(__dirname, '../../../../migrations/0001_init.sql');

describe('createTestDb', () => {
  it('applies the Phase 1 migration and can round-trip a row', async () => {
    const db = createTestDb([MIGRATION]);
    await db
      .prepare('INSERT INTO accounts (id,email,password_hash,salt,tz_offset_min,created_at) VALUES (?,?,?,?,?,?)')
      .bind('a1', 'p@example.com', 'h', 's', 0, '2026-07-10T00:00:00Z')
      .run();
    const row = await db
      .prepare('SELECT email FROM accounts WHERE id = ?')
      .bind('a1')
      .first<{ email: string }>();
    expect(row?.email).toBe('p@example.com');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/auth/__testutils__/testdb.test.ts`
Expected: FAIL — cannot find module `./testdb` (before you created it) or, if created, PASS. If it fails for any other reason, fix before continuing.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/auth/__testutils__/testdb.test.ts`
Expected: PASS (1 test), and no ExperimentalWarning in the output.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json functions/_lib/http.ts functions/_lib/auth/types.ts functions/_lib/auth/__testutils__/
git commit -m "feat(auth): foundations — types, http helpers, node:sqlite test adapter"
```

---

### Task 2: Password hashing (PBKDF2)

**Files:**
- Create: `functions/_lib/auth/password.ts`
- Test: `functions/_lib/auth/password.test.ts`

**Interfaces:**
- Consumes: WebCrypto `crypto.subtle` (global in Node 18+ and Workers).
- Produces: `hashPassword(password: string): Promise<{ hash: string; salt: string }>` and `verifyPassword(password: string, hash: string, salt: string): Promise<boolean>` (both base64).

- [ ] **Step 1: Write the failing test**

`functions/_lib/auth/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const { hash, salt } = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', hash, salt)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const { hash, salt } = await hashPassword('correct horse');
    expect(await verifyPassword('battery staple', hash, salt)).toBe(false);
  });

  it('produces a unique salt per call (no plaintext leakage)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(a.hash).not.toContain('same');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/auth/password.test.ts`
Expected: FAIL — cannot find module `./password`.

- [ ] **Step 3: Implement `functions/_lib/auth/password.ts`**

```ts
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt);
  return { hash: toBase64(hash), salt: toBase64(salt) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const expected = fromBase64(hash);
  const actual = await derive(password, fromBase64(salt));
  if (actual.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/auth/password.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/password.ts functions/_lib/auth/password.test.ts
git commit -m "feat(auth): PBKDF2 password hashing and verification"
```

---

### Task 3: Session tokens, cookies, and request-token extraction

**Files:**
- Create: `functions/_lib/auth/tokens.ts`
- Create: `functions/_lib/auth/cookies.ts`
- Test: `functions/_lib/auth/tokens.test.ts`
- Test: `functions/_lib/auth/cookies.test.ts`

**Interfaces:**
- Produces:
  - `tokens.ts`: `generateSessionToken(): string` (base64url of 32 random bytes); `hashToken(token: string): Promise<string>` (base64 SHA-256); `sessionExpiry(now: Date, days?: number): string` (ISO, default 30 days).
  - `cookies.ts`: `SESSION_COOKIE = 'tth_session'`; `serializeSessionCookie(token: string, maxAgeSeconds: number): string`; `clearSessionCookie(): string`; `getRequestToken(request: Request): string | null` (Bearer header first, then the `tth_session` cookie).

- [ ] **Step 1: Write the failing tests**

`functions/_lib/auth/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';

describe('session tokens', () => {
  it('generates distinct, non-empty tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('hashes deterministically and does not return the raw token', async () => {
    const t = generateSessionToken();
    expect(await hashToken(t)).toBe(await hashToken(t));
    expect(await hashToken(t)).not.toBe(t);
  });

  it('computes an expiry N days ahead', () => {
    expect(sessionExpiry(new Date('2026-07-10T00:00:00Z'), 30)).toBe('2026-08-09T00:00:00.000Z');
  });
});
```

`functions/_lib/auth/cookies.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serializeSessionCookie, clearSessionCookie, getRequestToken, SESSION_COOKIE } from './cookies';

describe('session cookie', () => {
  it('serializes with the required security attributes', () => {
    const c = serializeSessionCookie('tok123', 2592000);
    expect(c).toContain(`${SESSION_COOKIE}=tok123`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Path=/');
    expect(c).toContain('Max-Age=2592000');
  });

  it('clears the cookie with Max-Age=0', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('getRequestToken', () => {
  it('prefers the Authorization Bearer header', () => {
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer abc' } });
    expect(getRequestToken(req)).toBe('abc');
  });

  it('falls back to the session cookie', () => {
    const req = new Request('https://x/', { headers: { Cookie: `foo=1; ${SESSION_COOKIE}=xyz; bar=2` } });
    expect(getRequestToken(req)).toBe('xyz');
  });

  it('returns null when neither is present', () => {
    expect(getRequestToken(new Request('https://x/'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run functions/_lib/auth/tokens.test.ts functions/_lib/auth/cookies.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `functions/_lib/auth/tokens.ts`**

```ts
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  let binary = '';
  for (const b of new Uint8Array(digest)) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function sessionExpiry(now: Date, days = 30): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}
```

- [ ] **Step 4: Implement `functions/_lib/auth/cookies.ts`**

```ts
export const SESSION_COOKIE = 'tth_session';

export function serializeSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getRequestToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    for (const part of cookie.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === SESSION_COOKIE) return rest.join('=') || null;
    }
  }
  return null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run functions/_lib/auth/tokens.test.ts functions/_lib/auth/cookies.test.ts`
Expected: PASS (3 + 5 tests).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/auth/tokens.ts functions/_lib/auth/cookies.ts functions/_lib/auth/tokens.test.ts functions/_lib/auth/cookies.test.ts
git commit -m "feat(auth): session tokens, cookies, and request-token extraction"
```

---

### Task 4: Email/password validation

**Files:**
- Create: `functions/_lib/auth/validation.ts`
- Test: `functions/_lib/auth/validation.test.ts`

**Interfaces:**
- Produces: `normalizeEmail(email: string): string`; `isValidEmail(email: string): boolean`; `isValidPassword(password: string): boolean` (length ≥ 8).

- [ ] **Step 1: Write the failing test**

`functions/_lib/auth/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeEmail, isValidEmail, isValidPassword } from './validation';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Parent@Example.COM ')).toBe('parent@example.com');
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('requires at least 8 characters', () => {
    expect(isValidPassword('7chars!')).toBe(false);
    expect(isValidPassword('eightchr')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/auth/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `functions/_lib/auth/validation.ts`**

```ts
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately simple: one @, a dot in the domain, no spaces. Real delivery is
// the ultimate validator; we only guard against obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/auth/validation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/validation.ts functions/_lib/auth/validation.test.ts
git commit -m "feat(auth): email normalization and input validation"
```

---

### Task 5: Account & session repository (D1)

**Files:**
- Create: `functions/_lib/auth/repo.ts`
- Test: `functions/_lib/auth/repo.test.ts`

**Interfaces:**
- Consumes: `Db`, `Account` from `./types`.
- Produces:
  - `createAccount(db, a: { id; email; passwordHash; salt; tzOffsetMin; createdAt }): Promise<void>`
  - `findAccountByEmail(db, email: string): Promise<Account | null>`
  - `getAccountById(db, id: string): Promise<Account | null>`
  - `createSession(db, s: { tokenHash; accountId; expiresAt; createdAt }): Promise<void>`
  - `findAccountBySessionHash(db, tokenHash: string, nowIso: string): Promise<Account | null>` (excludes expired)
  - `deleteSession(db, tokenHash: string): Promise<void>`
  - A row-mapping helper is internal.

- [ ] **Step 1: Write the failing test**

`functions/_lib/auth/repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import {
  createAccount, findAccountByEmail, getAccountById,
  createSession, findAccountBySessionHash, deleteSession,
} from './repo';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;

beforeEach(() => {
  db = createTestDb([MIGRATION]);
});

const acct = {
  id: 'acc1', email: 'p@example.com', passwordHash: 'H', salt: 'S',
  tzOffsetMin: 60, createdAt: '2026-07-10T00:00:00Z',
};

describe('account repo', () => {
  it('creates and finds an account by email and id', async () => {
    await createAccount(db, acct);
    const byEmail = await findAccountByEmail(db, 'p@example.com');
    expect(byEmail?.id).toBe('acc1');
    expect(byEmail?.tzOffsetMin).toBe(60);
    expect((await getAccountById(db, 'acc1'))?.email).toBe('p@example.com');
    expect(await findAccountByEmail(db, 'missing@example.com')).toBeNull();
  });
});

describe('session repo', () => {
  beforeEach(async () => { await createAccount(db, acct); });

  it('resolves a live session to its account', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
    });
    const found = await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z');
    expect(found?.id).toBe('acc1');
  });

  it('does not resolve an expired session', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-07-10T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
    });
    expect(await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z')).toBeNull();
  });

  it('deletes a session', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
    });
    await deleteSession(db, 'TH');
    expect(await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/auth/repo.test.ts`
Expected: FAIL — module `./repo` not found.

- [ ] **Step 3: Implement `functions/_lib/auth/repo.ts`**

```ts
import type { Db, Account } from './types';

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  tz_offset_min: number;
  created_at: string;
}

function mapAccount(r: AccountRow | null): Account | null {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    salt: r.salt,
    tzOffsetMin: r.tz_offset_min,
    createdAt: r.created_at,
  };
}

export async function createAccount(
  db: Db,
  a: { id: string; email: string; passwordHash: string; salt: string; tzOffsetMin: number; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO accounts (id,email,password_hash,salt,tz_offset_min,created_at) VALUES (?,?,?,?,?,?)')
    .bind(a.id, a.email, a.passwordHash, a.salt, a.tzOffsetMin, a.createdAt)
    .run();
}

export async function findAccountByEmail(db: Db, email: string): Promise<Account | null> {
  const row = await db.prepare('SELECT * FROM accounts WHERE email = ?').bind(email).first<AccountRow>();
  return mapAccount(row);
}

export async function getAccountById(db: Db, id: string): Promise<Account | null> {
  const row = await db.prepare('SELECT * FROM accounts WHERE id = ?').bind(id).first<AccountRow>();
  return mapAccount(row);
}

export async function createSession(
  db: Db,
  s: { tokenHash: string; accountId: string; expiresAt: string; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO auth_sessions (token_hash,account_id,expires_at,created_at) VALUES (?,?,?,?)')
    .bind(s.tokenHash, s.accountId, s.expiresAt, s.createdAt)
    .run();
}

export async function findAccountBySessionHash(
  db: Db,
  tokenHash: string,
  nowIso: string,
): Promise<Account | null> {
  const row = await db
    .prepare(
      `SELECT a.* FROM accounts a
       JOIN auth_sessions s ON s.account_id = a.id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, nowIso)
    .first<AccountRow>();
  return mapAccount(row);
}

export async function deleteSession(db: Db, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/auth/repo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/repo.ts functions/_lib/auth/repo.test.ts
git commit -m "feat(auth): D1 account and session repository"
```

---

### Task 6: `authenticate()` request helper

**Files:**
- Create: `functions/_lib/auth/authenticate.ts`
- Test: `functions/_lib/auth/authenticate.test.ts`

**Interfaces:**
- Consumes: `getRequestToken` (`./cookies`), `hashToken` (`./tokens`), `findAccountBySessionHash` (`./repo`), `Db`/`Account` (`./types`).
- Produces: `authenticate(request: Request, db: Db, now: Date): Promise<Account | null>`.

- [ ] **Step 1: Write the failing test**

`functions/_lib/auth/authenticate.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { createAccount, createSession } from './repo';
import { hashToken } from './tokens';
import { authenticate } from './authenticate';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
const now = new Date('2026-07-11T00:00:00Z');

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await createAccount(db, {
    id: 'acc1', email: 'p@example.com', passwordHash: 'H', salt: 'S',
    tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z',
  });
});

async function seedSession(token: string) {
  await createSession(db, {
    tokenHash: await hashToken(token), accountId: 'acc1',
    expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
  });
}

describe('authenticate', () => {
  it('authenticates via Bearer token', async () => {
    await seedSession('tokenA');
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer tokenA' } });
    expect((await authenticate(req, db, now))?.id).toBe('acc1');
  });

  it('authenticates via session cookie', async () => {
    await seedSession('tokenB');
    const req = new Request('https://x/', { headers: { Cookie: 'tth_session=tokenB' } });
    expect((await authenticate(req, db, now))?.id).toBe('acc1');
  });

  it('returns null when no token is present', async () => {
    expect(await authenticate(new Request('https://x/'), db, now)).toBeNull();
  });

  it('returns null for an unknown token', async () => {
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer nope' } });
    expect(await authenticate(req, db, now)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/auth/authenticate.test.ts`
Expected: FAIL — module `./authenticate` not found.

- [ ] **Step 3: Implement `functions/_lib/auth/authenticate.ts`**

```ts
import type { Db, Account } from './types';
import { getRequestToken } from './cookies';
import { hashToken } from './tokens';
import { findAccountBySessionHash } from './repo';

export async function authenticate(request: Request, db: Db, now: Date): Promise<Account | null> {
  const token = getRequestToken(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return findAccountBySessionHash(db, tokenHash, now.toISOString());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/auth/authenticate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/auth/authenticate.ts functions/_lib/auth/authenticate.test.ts
git commit -m "feat(auth): authenticate() request helper (cookie or bearer)"
```

---

### Task 7: Signup handler

**Files:**
- Create: `functions/_lib/auth/service.ts` (shared session-issuing helper)
- Create: `functions/api/auth/signup.ts`
- Test: `functions/api/auth/signup.test.ts`

**Interfaces:**
- Consumes: repo, password, tokens, cookies, validation, http helpers, `Env`.
- Produces:
  - `service.ts`: `issueSession(db, accountId, now): Promise<{ token: string; cookie: string }>` — creates a session row, returns the raw token and a serialized cookie.
  - `signup.ts`: `onRequestPost(ctx: { request: Request; env: Env }): Promise<Response>`.
- Response contract: on success HTTP **201**, `Set-Cookie: tth_session=…`, body `{ "token": "<raw>", "account": { "id", "email" } }`. Duplicate email → **409** `{"error":"email_taken"}`. Invalid input → **400** `{"error":"invalid_input"}`.

- [ ] **Step 1: Write the failing test**

`functions/api/auth/signup.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost } from './signup';
import { authenticate } from '../../_lib/auth/authenticate';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(() => { db = createTestDb([MIGRATION]); });

const post = (body: unknown) =>
  onRequestPost({
    request: new Request('https://x/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env: { DB: db },
  });

describe('POST /api/auth/signup', () => {
  it('creates an account, sets a cookie, returns a usable token', async () => {
    const res = await post({ email: 'New@Example.com', password: 'longenough' });
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toContain('tth_session=');
    const bodyJson = await res.json() as { token: string; account: { email: string } };
    expect(bodyJson.account.email).toBe('new@example.com'); // normalized

    // the returned bearer token authenticates. Use the real clock here because
    // signup issued the session with new Date(); a hardcoded "now" could fall
    // outside the session's real-time validity window and flake.
    const authed = await authenticate(
      new Request('https://x/', { headers: { Authorization: `Bearer ${bodyJson.token}` } }),
      db, new Date(),
    );
    expect(authed?.email).toBe('new@example.com');
  });

  it('rejects a short password with 400', async () => {
    expect((await post({ email: 'a@b.co', password: 'short' })).status).toBe(400);
  });

  it('rejects a duplicate email with 409 (generic code)', async () => {
    await post({ email: 'dup@example.com', password: 'longenough' });
    const res = await post({ email: 'dup@example.com', password: 'longenough' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email_taken' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/api/auth/signup.test.ts`
Expected: FAIL — module `./signup` not found.

- [ ] **Step 3: Implement `functions/_lib/auth/service.ts`**

```ts
import type { Db } from './types';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';
import { serializeSessionCookie } from './cookies';
import { createSession } from './repo';

const THIRTY_DAYS_SECONDS = 30 * 86_400;

export async function issueSession(
  db: Db,
  accountId: string,
  now: Date,
): Promise<{ token: string; cookie: string }> {
  const token = generateSessionToken();
  await createSession(db, {
    tokenHash: await hashToken(token),
    accountId,
    expiresAt: sessionExpiry(now, 30),
    createdAt: now.toISOString(),
  });
  return { token, cookie: serializeSessionCookie(token, THIRTY_DAYS_SECONDS) };
}
```

- [ ] **Step 4: Implement `functions/api/auth/signup.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { normalizeEmail, isValidEmail, isValidPassword } from '../../_lib/auth/validation';
import { hashPassword } from '../../_lib/auth/password';
import { createAccount, findAccountByEmail } from '../../_lib/auth/repo';
import { issueSession } from '../../_lib/auth/service';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string; tzOffsetMin?: number }>(ctx.request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return error(400, 'invalid_input');
  }
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email) || !isValidPassword(body.password)) {
    return error(400, 'invalid_input');
  }
  if (await findAccountByEmail(ctx.env.DB, email)) {
    return error(409, 'email_taken');
  }

  const now = new Date();
  const { hash, salt } = await hashPassword(body.password);
  const id = crypto.randomUUID();
  await createAccount(ctx.env.DB, {
    id, email, passwordHash: hash, salt,
    tzOffsetMin: typeof body.tzOffsetMin === 'number' ? body.tzOffsetMin : 0,
    createdAt: now.toISOString(),
  });

  const { token, cookie } = await issueSession(ctx.env.DB, id, now);
  return json({ token, account: { id, email } }, { status: 201, headers: { 'Set-Cookie': cookie } });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run functions/api/auth/signup.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/auth/service.ts functions/api/auth/signup.ts functions/api/auth/signup.test.ts
git commit -m "feat(auth): signup handler issuing session cookie + bearer token"
```

---

### Task 8: Login, logout, and `me` handlers

**Files:**
- Create: `functions/api/auth/login.ts`
- Create: `functions/api/auth/logout.ts`
- Create: `functions/api/auth/me.ts`
- Test: `functions/api/auth/login.test.ts`
- Test: `functions/api/auth/session.test.ts` (covers logout + me together)

**Interfaces:**
- Consumes: repo, password, service, authenticate, cookies, http helpers, `Env`.
- Produces:
  - `login.ts`: `onRequestPost(ctx)` → **200** `{ token, account:{id,email} }` + `Set-Cookie`; bad creds → **401** `{"error":"invalid_credentials"}` (generic, whether or not the email exists).
  - `logout.ts`: `onRequestPost(ctx)` → **200** `{ ok: true }`, deletes the session row (if any) and returns a cleared cookie.
  - `me.ts`: `onRequestGet(ctx)` → **200** `{ account:{id,email} }` when authenticated, else **401** `{"error":"unauthorized"}`.

- [ ] **Step 1: Write the failing tests**

`functions/api/auth/login.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as login } from './login';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await signup({
    request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }),
    env: { DB: db },
  });
});

const doLogin = (body: unknown) =>
  login({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify(body) }), env: { DB: db } });

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await doLogin({ email: 'P@Example.com', password: 'longenough' });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('tth_session=');
    expect((await res.json() as { account: { email: string } }).account.email).toBe('p@example.com');
  });

  it('returns generic 401 for a wrong password', async () => {
    const res = await doLogin({ email: 'p@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('returns the SAME generic 401 for an unknown email (no enumeration)', async () => {
    const res = await doLogin({ email: 'ghost@example.com', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });
});
```

`functions/api/auth/session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as logout } from './logout';
import { onRequestGet as me } from './me';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  const res = await signup({
    request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }),
    env: { DB: db },
  });
  token = (await res.json() as { token: string }).token;
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('me + logout', () => {
  it('me returns the account when authenticated', async () => {
    const res = await me({ request: new Request('https://x/', { headers: bearer(token) }), env: { DB: db } });
    expect(res.status).toBe(200);
    expect((await res.json() as { account: { email: string } }).account.email).toBe('p@example.com');
  });

  it('me returns 401 without a token', async () => {
    const res = await me({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('logout invalidates the session', async () => {
    await logout({ request: new Request('https://x/', { method: 'POST', headers: bearer(token) }), env: { DB: db } });
    const after = await me({ request: new Request('https://x/', { headers: bearer(token) }), env: { DB: db } });
    expect(after.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run functions/api/auth/login.test.ts functions/api/auth/session.test.ts`
Expected: FAIL — modules `./login`, `./logout`, `./me` not found.

- [ ] **Step 3: Implement `functions/api/auth/login.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { normalizeEmail } from '../../_lib/auth/validation';
import { verifyPassword } from '../../_lib/auth/password';
import { findAccountByEmail } from '../../_lib/auth/repo';
import { issueSession } from '../../_lib/auth/service';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string }>(ctx.request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return error(401, 'invalid_credentials');
  }
  const email = normalizeEmail(body.email);
  const account = await findAccountByEmail(ctx.env.DB, email);
  // Always run verifyPassword shape check to reduce timing signal; on a missing
  // account there is no hash, so just return the generic error.
  if (!account || !(await verifyPassword(body.password, account.passwordHash, account.salt))) {
    return error(401, 'invalid_credentials');
  }
  const now = new Date();
  const { token, cookie } = await issueSession(ctx.env.DB, account.id, now);
  return json({ token, account: { id: account.id, email: account.email } }, { headers: { 'Set-Cookie': cookie } });
}
```

- [ ] **Step 4: Implement `functions/api/auth/logout.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { getRequestToken, clearSessionCookie } from '../../_lib/auth/cookies';
import { hashToken } from '../../_lib/auth/tokens';
import { deleteSession } from '../../_lib/auth/repo';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const token = getRequestToken(ctx.request);
  if (token) {
    await deleteSession(ctx.env.DB, await hashToken(token));
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
```

- [ ] **Step 5: Implement `functions/api/auth/me.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error } from '../../_lib/http';
import { authenticate } from '../../_lib/auth/authenticate';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await authenticate(ctx.request, ctx.env.DB, new Date());
  if (!account) return error(401, 'unauthorized');
  return json({ account: { id: account.id, email: account.email } });
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run functions/api/auth/login.test.ts functions/api/auth/session.test.ts`
Expected: PASS (3 + 3 tests).

- [ ] **Step 7: Commit**

```bash
git add functions/api/auth/login.ts functions/api/auth/logout.ts functions/api/auth/me.ts functions/api/auth/login.test.ts functions/api/auth/session.test.ts
git commit -m "feat(auth): login, logout, and me handlers"
```

---

### Task 9: Login rate limiting (fixed window)

**Files:**
- Create: `migrations/0002_login_attempts.sql`
- Create: `functions/_lib/auth/rate-limit.ts`
- Modify: `functions/api/auth/login.ts` (wire the limiter in)
- Test: `functions/_lib/auth/rate-limit.test.ts`
- Test: `functions/api/auth/login-throttle.test.ts`

**Interfaces:**
- Consumes: `Db` from `./types`.
- Produces:
  - Migration adding `login_attempts(email TEXT, window_start TEXT, count INTEGER, PRIMARY KEY(email, window_start))`.
  - `rate-limit.ts`: `recordAndCheck(db, email, now, opts?: { maxAttempts?: number; windowMs?: number }): Promise<{ blocked: boolean }>` — increments the current fixed window's counter for the email and returns `blocked=true` once attempts exceed the max (default **10** per **15 min**). `windowKey(now, windowMs)` helper.
  - `login.ts` returns **429** `{"error":"too_many_attempts"}` when blocked, BEFORE checking credentials.

- [ ] **Step 1: Write the migration `migrations/0002_login_attempts.sql`**

```sql
-- Fixed-window login throttle. One row per (email, window_start); the app
-- increments count and compares against the limit.
CREATE TABLE login_attempts (
  email        TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (email, window_start)
);
```

- [ ] **Step 2: Write the failing unit test**

`functions/_lib/auth/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { recordAndCheck } from './rate-limit';
import type { Db } from './types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
];
let db: Db;
beforeEach(() => { db = createTestDb(MIGRATIONS); });

const opts = { maxAttempts: 3, windowMs: 900_000 };

describe('recordAndCheck', () => {
  it('blocks only after exceeding the max within a window', async () => {
    const now = new Date('2026-07-10T10:00:00Z');
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 1
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 2
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 3
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(true);  // 4 > 3
  });

  it('resets in a new window', async () => {
    const w1 = new Date('2026-07-10T10:00:00Z');
    for (let i = 0; i < 4; i++) await recordAndCheck(db, 'p@x.com', w1, opts);
    const w2 = new Date('2026-07-10T10:20:00Z'); // next 15-min window
    expect((await recordAndCheck(db, 'p@x.com', w2, opts)).blocked).toBe(false);
  });

  it('tracks emails independently', async () => {
    const now = new Date('2026-07-10T10:00:00Z');
    for (let i = 0; i < 4; i++) await recordAndCheck(db, 'a@x.com', now, opts);
    expect((await recordAndCheck(db, 'b@x.com', now, opts)).blocked).toBe(false);
  });
});
```

- [ ] **Step 3: Run the unit test to verify it fails**

Run: `npx vitest run functions/_lib/auth/rate-limit.test.ts`
Expected: FAIL — module `./rate-limit` not found.

- [ ] **Step 4: Implement `functions/_lib/auth/rate-limit.ts`**

```ts
import type { Db } from './types';

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 900_000; // 15 minutes

/** Start-of-window ISO key: floor(now / windowMs) * windowMs. */
export function windowKey(now: Date, windowMs: number): string {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
}

export async function recordAndCheck(
  db: Db,
  email: string,
  now: Date,
  opts: { maxAttempts?: number; windowMs?: number } = {},
): Promise<{ blocked: boolean }> {
  const max = opts.maxAttempts ?? DEFAULT_MAX;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const key = windowKey(now, windowMs);

  await db
    .prepare(
      `INSERT INTO login_attempts (email, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(email, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(email, key)
    .run();

  const row = await db
    .prepare('SELECT count FROM login_attempts WHERE email = ? AND window_start = ?')
    .bind(email, key)
    .first<{ count: number }>();

  return { blocked: (row?.count ?? 0) > max };
}
```

- [ ] **Step 5: Run the unit test to verify it passes**

Run: `npx vitest run functions/_lib/auth/rate-limit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the failing handler-throttle test**

`functions/api/auth/login-throttle.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as login } from './login';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
];
let db: Db;
beforeEach(async () => {
  db = createTestDb(MIGRATIONS);
  await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }), env: { DB: db } });
});

const badLogin = () =>
  login({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'wrongpass1' }) }), env: { DB: db } });

describe('login throttling', () => {
  it('returns 429 after too many failed attempts', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await badLogin()).status;
    expect(last).toBe(429);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run functions/api/auth/login-throttle.test.ts`
Expected: FAIL — login does not yet return 429 (all attempts are 401).

- [ ] **Step 8: Wire the limiter into `functions/api/auth/login.ts`**

Replace the body of `onRequestPost` so the throttle runs after input parsing and email normalization but BEFORE credential verification:

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { normalizeEmail } from '../../_lib/auth/validation';
import { verifyPassword } from '../../_lib/auth/password';
import { findAccountByEmail } from '../../_lib/auth/repo';
import { issueSession } from '../../_lib/auth/service';
import { recordAndCheck } from '../../_lib/auth/rate-limit';

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string }>(ctx.request);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return error(401, 'invalid_credentials');
  }
  const email = normalizeEmail(body.email);

  const now = new Date();
  if ((await recordAndCheck(ctx.env.DB, email, now)).blocked) {
    return error(429, 'too_many_attempts');
  }

  const account = await findAccountByEmail(ctx.env.DB, email);
  if (!account || !(await verifyPassword(body.password, account.passwordHash, account.salt))) {
    return error(401, 'invalid_credentials');
  }
  const { token, cookie } = await issueSession(ctx.env.DB, account.id, now);
  return json({ token, account: { id: account.id, email: account.email } }, { headers: { 'Set-Cookie': cookie } });
}
```

- [ ] **Step 9: Run the throttle + prior login tests to verify all pass**

Run: `npx vitest run functions/api/auth/login.test.ts functions/api/auth/login-throttle.test.ts`
Expected: PASS. (The default max is 10, so the 3 earlier login.test.ts cases — which make at most 1 attempt each — are unaffected.)

- [ ] **Step 10: Apply migration 0002 locally and commit**

Run: `npm run db:migrate:local && npm run db:tables:local`
Expected: table list now also includes `login_attempts`.

```bash
git add migrations/0002_login_attempts.sql functions/_lib/auth/rate-limit.ts functions/api/auth/login.ts functions/_lib/auth/rate-limit.test.ts functions/api/auth/login-throttle.test.ts
git commit -m "feat(auth): fixed-window login rate limiting"
```

---

### Task 10: Full-suite green + engine untouched

**Files:** none (verification task).

- [ ] **Step 1: Run the entire test suite**

Run: `npx vitest run`
Expected: all existing tests plus every new `functions/_lib/auth/**` and `functions/api/auth/**` test pass; the Phase 1 `functions/_lib/rewards/**` tests are unchanged and still green. Output pristine (no ExperimentalWarning, no unhandled-rejection noise).

- [ ] **Step 2: If any pre-existing test flakes, re-run once to confirm it is not caused by this branch**

Run: `npx vitest run`
Expected: green. (A known transient flake exists in the pre-existing `src` suite unrelated to this work; a clean second run confirms it.)

No commit (verification only).

---

## Self-Review

**Spec coverage (Phase 2 = the spec's Auth section + build-order phase 2):**
- Email+password parent login, self-hosted, no auth library → Tasks 2–8. ✅
- PBKDF2 hashing, never plaintext → Task 2 + Global Constraints. ✅
- Session token stored hashed; raw token only to client → Tasks 3, 5, 7. ✅
- Web cookie AND native bearer both accepted → Tasks 3 (`getRequestToken`), 6 (`authenticate`). ✅
- Generic login errors / no enumeration → Task 8 login tests (wrong password and unknown email both 401 identical). ✅
- Rate-limit login attempts → Task 9. ✅
- Kids never authenticate → not applicable here (no kid auth introduced); picker stays local. ✅ (documented, no code)
- Account deletion endpoint, `/api/kids`, `/api/rules`, `/api/sessions`, dashboard → **later phases**, intentionally out of Phase 2 scope.

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✅

**Type consistency:** `Db`/`Stmt`/`Account`/`Env` (Task 1) are consumed unchanged by repo, authenticate, service, and all handlers. `issueSession` (Task 7) returns `{ token, cookie }` and is used identically in login (Task 8). `getRequestToken`, `hashToken`, `findAccountBySessionHash`, `SESSION_COOKIE = 'tth_session'`, and the `{ error: <code> }` response shape are used consistently across tasks. Handler signature `onRequestPost/onRequestGet(ctx: { request; env })` matches the Pages Functions calling convention and the tests. ✅
