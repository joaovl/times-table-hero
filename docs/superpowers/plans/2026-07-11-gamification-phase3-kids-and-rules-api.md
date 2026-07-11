# Gamification Phase 3 — Kids & Reward-Rules API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated Cloudflare Pages Functions to manage a parent's kids (`/api/kids`) and their reward rules (`/api/rules`) over the Phase 1 D1 schema, so the upcoming rules-settings screen has a backend.

**Architecture:** Thin D1 repositories under `functions/_lib/kids/` and `functions/_lib/rules/`, plus HTTP handlers under `functions/api/kids/` and `functions/api/rules/`. Every handler is guarded by the Phase 2 `authenticate()` and scopes all queries to the authenticated account. Reward-rule payloads reuse the Phase 1 engine's `Level1Rule/Level2Rule/Level3Rule` types; a validator rejects malformed rules before storage. All D1 code is integration-tested in plain Vitest via the existing `node:sqlite` adapter.

**Tech Stack:** TypeScript, Cloudflare Pages Functions, D1 (prod) / node:sqlite (tests), Vitest.

## Global Constraints

- Every `/api/kids` and `/api/rules` endpoint requires a valid session; unauthenticated → HTTP **401** `{"error":"unauthorized"}`. Use a shared `requireAccount` guard.
- All reads/writes are **scoped to the authenticated account**; a parent can never see or mutate another account's kids or rules (enforced in the SQL `WHERE account_id = ?`, not just in app logic).
- Kid fields: `name` (non-empty, ≤ 40 chars after trim), `color`, `icon` (both non-empty strings). Invalid → **400** `{"error":"invalid_input"}`.
- A kid id is `crypto.randomUUID()`. Reward-rule row id is `crypto.randomUUID()`.
- Reward rules stored per scope: `kid_id = NULL` means "applies to all kids". Upsert keys on `(account_id, kid_id-or-all)` — the Phase 1 unique index `idx_rules_scope(account_id, IFNULL(kid_id,''))` enforces one row per scope.
- Stored rule payload is the engine config only: `{ level1, level2, level3 }` (Level1Rule/Level2Rule/Level3Rule from `functions/_lib/rewards/types.ts`). The account timezone lives on `accounts.tz_offset_min`, not in the rules row.
- A rules PUT for a `kidId` must verify that kid belongs to the account before writing.
- New files only under `functions/`; do not touch the no-account app path, the Phase 1 engine, or Phase 2 auth internals (except importing them).
- "Now" (timestamps) uses `new Date().toISOString()` inside handlers.

---

### Task 1: Kids repository

**Files:**
- Create: `functions/_lib/kids/types.ts`
- Create: `functions/_lib/kids/repo.ts`
- Test: `functions/_lib/kids/repo.test.ts`

**Interfaces:**
- Consumes: `Db` from `functions/_lib/auth/types`.
- Produces:
  - `Kid = { id: string; accountId: string; name: string; color: string; icon: string; createdAt: string }`.
  - `createKid(db, k: { id; accountId; name; color; icon; createdAt }): Promise<void>`
  - `listKids(db, accountId: string): Promise<Kid[]>` (ordered by createdAt)
  - `getKid(db, accountId: string, id: string): Promise<Kid | null>` (scoped)
  - `deleteKid(db, accountId: string, id: string): Promise<void>` (scoped)

- [ ] **Step 1: Write the failing test**

`functions/_lib/kids/repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../auth/__testutils__/testdb';
import { createAccount } from '../auth/repo';
import { createKid, listKids, getKid, deleteKid } from './repo';
import type { Db } from '../auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await createAccount(db, { id: 'acc1', email: 'p@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
  await createAccount(db, { id: 'acc2', email: 'q@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
});

const kid = (over: Partial<{ id: string; accountId: string; name: string; color: string; icon: string; createdAt: string }> = {}) => ({
  id: 'k1', accountId: 'acc1', name: 'Sam', color: 'blue', icon: 'star', createdAt: '2026-07-10T00:00:00Z', ...over,
});

describe('kids repo', () => {
  it('creates and lists kids for an account only', async () => {
    await createKid(db, kid({ id: 'k1', name: 'Sam' }));
    await createKid(db, kid({ id: 'k2', name: 'Alex', createdAt: '2026-07-10T01:00:00Z' }));
    await createKid(db, kid({ id: 'k3', accountId: 'acc2', name: 'Other' }));

    const mine = await listKids(db, 'acc1');
    expect(mine.map(k => k.name)).toEqual(['Sam', 'Alex']);
  });

  it('getKid is account-scoped', async () => {
    await createKid(db, kid({ id: 'k1', accountId: 'acc1' }));
    expect((await getKid(db, 'acc1', 'k1'))?.name).toBe('Sam');
    expect(await getKid(db, 'acc2', 'k1')).toBeNull(); // not your kid
  });

  it('deleteKid is account-scoped', async () => {
    await createKid(db, kid({ id: 'k1', accountId: 'acc1' }));
    await deleteKid(db, 'acc2', 'k1'); // wrong account: no-op
    expect(await getKid(db, 'acc1', 'k1')).not.toBeNull();
    await deleteKid(db, 'acc1', 'k1');
    expect(await getKid(db, 'acc1', 'k1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/_lib/kids/repo.test.ts`
Expected: FAIL — module `./repo` not found.

- [ ] **Step 3: Implement `functions/_lib/kids/types.ts`**

```ts
export interface Kid {
  id: string;
  accountId: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}
```

- [ ] **Step 4: Implement `functions/_lib/kids/repo.ts`**

```ts
import type { Db } from '../auth/types';
import type { Kid } from './types';

interface KidRow {
  id: string;
  account_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

const map = (r: KidRow): Kid => ({
  id: r.id, accountId: r.account_id, name: r.name, color: r.color, icon: r.icon, createdAt: r.created_at,
});

export async function createKid(
  db: Db,
  k: { id: string; accountId: string; name: string; color: string; icon: string; createdAt: string },
): Promise<void> {
  await db
    .prepare('INSERT INTO kids (id,account_id,name,color,icon,created_at) VALUES (?,?,?,?,?,?)')
    .bind(k.id, k.accountId, k.name, k.color, k.icon, k.createdAt)
    .run();
}

export async function listKids(db: Db, accountId: string): Promise<Kid[]> {
  const { results } = await db
    .prepare('SELECT * FROM kids WHERE account_id = ? ORDER BY created_at ASC')
    .bind(accountId)
    .all<KidRow>();
  return results.map(map);
}

export async function getKid(db: Db, accountId: string, id: string): Promise<Kid | null> {
  const row = await db
    .prepare('SELECT * FROM kids WHERE account_id = ? AND id = ?')
    .bind(accountId, id)
    .first<KidRow>();
  return row ? map(row) : null;
}

export async function deleteKid(db: Db, accountId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM kids WHERE account_id = ? AND id = ?').bind(accountId, id).run();
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run functions/_lib/kids/repo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/kids/
git commit -m "feat(kids): account-scoped kids repository"
```

---

### Task 2: Auth guard + kids handlers

**Files:**
- Create: `functions/_lib/auth/guard.ts`
- Create: `functions/api/kids/index.ts`
- Create: `functions/api/kids/[id].ts`
- Test: `functions/api/kids/kids.test.ts`

**Interfaces:**
- Consumes: `authenticate` (`../../_lib/auth/authenticate`), kids repo, http helpers, `Env`/`Account`.
- Produces:
  - `guard.ts`: `requireAccount(request: Request, db: Db): Promise<Account | Response>` — returns the account, or a 401 Response when unauthenticated.
  - `kids/index.ts`: `onRequestGet(ctx)` → `{ kids: Kid[] }`; `onRequestPost(ctx)` → **201** `{ kid }`.
  - `kids/[id].ts`: `onRequestDelete(ctx)` → `{ ok: true }` (ctx has `params.id`).

- [ ] **Step 1: Write the failing test**

`functions/api/kids/kids.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestGet as listKidsRoute, onRequestPost as createKidRoute } from './index';
import { onRequestDelete as deleteKidRoute } from './[id]';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('/api/kids', () => {
  it('requires authentication', async () => {
    const res = await listKidsRoute({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('creates and lists kids for the account', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    expect(created.status).toBe(201);
    const { kid } = await created.json() as { kid: { id: string; name: string } };
    expect(kid.name).toBe('Sam');

    const listed = await listKidsRoute({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { kids } = await listed.json() as { kids: { name: string }[] };
    expect(kids.map(k => k.name)).toEqual(['Sam']);
  });

  it('rejects an empty name with 400', async () => {
    const res = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: '  ', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
  });

  it('deletes a kid by id', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    const { kid } = await created.json() as { kid: { id: string } };
    const del = await deleteKidRoute({ request: new Request('https://x/', { method: 'DELETE', headers: auth() }), env: { DB: db }, params: { id: kid.id } });
    expect(del.status).toBe(200);
    const listed = await listKidsRoute({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    expect((await listed.json() as { kids: unknown[] }).kids).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/api/kids/kids.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `functions/_lib/auth/guard.ts`**

```ts
import type { Account, Db } from './types';
import { authenticate } from './authenticate';
import { error } from '../http';

/** Returns the authenticated account, or a 401 Response to return directly. */
export async function requireAccount(request: Request, db: Db): Promise<Account | Response> {
  const account = await authenticate(request, db, new Date());
  return account ?? error(401, 'unauthorized');
}
```

- [ ] **Step 4: Implement `functions/api/kids/index.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { createKid, listKids } from '../../_lib/kids/repo';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ kids: await listKids(ctx.env.DB, account.id) });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ name?: string; color?: string; icon?: string }>(ctx.request);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = typeof body?.color === 'string' ? body.color : '';
  const icon = typeof body?.icon === 'string' ? body.icon : '';
  if (!name || name.length > 40 || !color || !icon) {
    return error(400, 'invalid_input');
  }

  const kid = { id: crypto.randomUUID(), accountId: account.id, name, color, icon, createdAt: new Date().toISOString() };
  await createKid(ctx.env.DB, kid);
  return json({ kid }, { status: 201 });
}
```

- [ ] **Step 5: Implement `functions/api/kids/[id].ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { deleteKid } from '../../_lib/kids/repo';

export async function onRequestDelete(ctx: { request: Request; env: Env; params: { id: string } }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  await deleteKid(ctx.env.DB, account.id, ctx.params.id);
  return json({ ok: true });
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run functions/api/kids/kids.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add functions/_lib/auth/guard.ts functions/api/kids/
git commit -m "feat(kids): authenticated kids CRUD endpoints"
```

---

### Task 3: Reward-rules config type + validator

**Files:**
- Create: `functions/_lib/rules/types.ts`
- Create: `functions/_lib/rules/validate.ts`
- Test: `functions/_lib/rules/validate.test.ts`

**Interfaces:**
- Consumes: `Level1Rule`, `Level2Rule`, `Level3Rule` from `functions/_lib/rewards/types`.
- Produces:
  - `RewardRulesConfig = { level1: Level1Rule; level2: Level2Rule; level3: Level3Rule }`.
  - `parseRewardRules(input: unknown): RewardRulesConfig | null` — returns the config when structurally valid, else null.

- [ ] **Step 1: Write the failing test**

`functions/_lib/rules/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRewardRules } from './validate';

const valid = {
  level1: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '1 pound' },
  level2: { successDaysRequired: 5, weeklyReward: '10 pounds' },
  level3: { enabled: true, target: '2weeks', reward: 'shoes' },
};

describe('parseRewardRules', () => {
  it('accepts a well-formed config', () => {
    expect(parseRewardRules(valid)).toEqual(valid);
  });

  it('accepts lastNAverage score and month target', () => {
    const cfg = { ...valid, level1: { ...valid.level1, score: { kind: 'lastNAverage', n: 2, minPercent: 100 } }, level3: { enabled: false, target: 'month', reward: 'x' } };
    expect(parseRewardRules(cfg)).not.toBeNull();
  });

  it('rejects a missing level', () => {
    const { level3, ...rest } = valid;
    void level3;
    expect(parseRewardRules(rest)).toBeNull();
  });

  it('rejects an empty goal (no goal fields set)', () => {
    expect(parseRewardRules({ ...valid, level1: { ...valid.level1, goal: {} } })).toBeNull();
  });

  it('rejects a bad score kind', () => {
    expect(parseRewardRules({ ...valid, level1: { ...valid.level1, score: { kind: 'nope', minPercent: 80 } } })).toBeNull();
  });

  it('rejects a bad level3 target', () => {
    expect(parseRewardRules({ ...valid, level3: { enabled: true, target: 'year', reward: 'x' } })).toBeNull();
  });

  it('rejects non-objects', () => {
    expect(parseRewardRules(null)).toBeNull();
    expect(parseRewardRules('x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/_lib/rules/validate.test.ts`
Expected: FAIL — module `./validate` not found.

- [ ] **Step 3: Implement `functions/_lib/rules/types.ts`**

```ts
import type { Level1Rule, Level2Rule, Level3Rule } from '../rewards/types';

export interface RewardRulesConfig {
  level1: Level1Rule;
  level2: Level2Rule;
  level3: Level3Rule;
}
```

- [ ] **Step 4: Implement `functions/_lib/rules/validate.ts`**

```ts
import type { Level1Rule, Level2Rule, Level3Rule } from '../rewards/types';
import type { RewardRulesConfig } from './types';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function parseLevel1(v: unknown): Level1Rule | null {
  if (!isObj(v) || !isObj(v.goal) || !isStr(v.dailyReward)) return null;
  const g = v.goal;
  const goalKeys: (keyof typeof g)[] = ['minutes', 'exercises', 'sessions'];
  const setGoals = goalKeys.filter(k => g[k] !== undefined);
  if (setGoals.length === 0 || !setGoals.every(k => isNum(g[k]))) return null;

  const s = v.score;
  if (!isObj(s)) return null;
  if (s.kind === 'dailyPercent') {
    if (!isNum(s.minPercent)) return null;
  } else if (s.kind === 'lastNAverage') {
    if (!isNum(s.n) || !isNum(s.minPercent)) return null;
  } else {
    return null;
  }

  if (v.weakTopics !== undefined) {
    const w = v.weakTopics;
    if (!isObj(w) || !Array.isArray(w.topics) || !w.topics.every(isStr) || !isNum(w.minPercent)) return null;
  }
  return v as unknown as Level1Rule;
}

function parseLevel2(v: unknown): Level2Rule | null {
  if (!isObj(v) || !isNum(v.successDaysRequired) || !isStr(v.weeklyReward)) return null;
  return v as unknown as Level2Rule;
}

function parseLevel3(v: unknown): Level3Rule | null {
  if (!isObj(v) || typeof v.enabled !== 'boolean' || !isStr(v.reward)) return null;
  if (v.target !== '2weeks' && v.target !== 'month') return null;
  return v as unknown as Level3Rule;
}

export function parseRewardRules(input: unknown): RewardRulesConfig | null {
  if (!isObj(input)) return null;
  const level1 = parseLevel1(input.level1);
  const level2 = parseLevel2(input.level2);
  const level3 = parseLevel3(input.level3);
  if (!level1 || !level2 || !level3) return null;
  return { level1, level2, level3 };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run functions/_lib/rules/validate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/rules/types.ts functions/_lib/rules/validate.ts functions/_lib/rules/validate.test.ts
git commit -m "feat(rules): reward-rules config type and validator"
```

---

### Task 4: Reward-rules repository

**Files:**
- Create: `functions/_lib/rules/repo.ts`
- Test: `functions/_lib/rules/repo.test.ts`

**Interfaces:**
- Consumes: `Db` (auth/types), `RewardRulesConfig` (./types).
- Produces:
  - `RulesRow = { kidId: string | null; config: RewardRulesConfig; updatedAt: string }`.
  - `upsertRules(db, accountId: string, kidId: string | null, config: RewardRulesConfig, updatedAt: string): Promise<void>` — one row per scope; second write to the same scope updates.
  - `listRules(db, accountId: string): Promise<RulesRow[]>`.

- [ ] **Step 1: Write the failing test**

`functions/_lib/rules/repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../auth/__testutils__/testdb';
import { createAccount } from '../auth/repo';
import { upsertRules, listRules } from './repo';
import type { Db } from '../auth/types';
import type { RewardRulesConfig } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await createAccount(db, { id: 'acc1', email: 'p@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
});

const cfg = (reward: string): RewardRulesConfig => ({
  level1: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: reward },
  level2: { successDaysRequired: 5, weeklyReward: '10' },
  level3: { enabled: false, target: '2weeks', reward: 'x' },
});

describe('rules repo', () => {
  it('stores an all-kids rule and a per-kid rule and lists both', async () => {
    await upsertRules(db, 'acc1', null, cfg('all'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', 'k1', cfg('k1'), '2026-07-10T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    const byScope = Object.fromEntries(rows.map(r => [r.kidId ?? 'ALL', r.config.level1.dailyReward]));
    expect(byScope).toEqual({ ALL: 'all', k1: 'k1' });
  });

  it('upsert replaces the same scope rather than duplicating', async () => {
    await upsertRules(db, 'acc1', null, cfg('first'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', null, cfg('second'), '2026-07-11T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    expect(rows).toHaveLength(1);
    expect(rows[0].config.level1.dailyReward).toBe('second');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/_lib/rules/repo.test.ts`
Expected: FAIL — module `./repo` not found.

- [ ] **Step 3: Implement `functions/_lib/rules/repo.ts`**

```ts
import type { Db } from '../auth/types';
import type { RewardRulesConfig } from './types';

export interface RulesRow {
  kidId: string | null;
  config: RewardRulesConfig;
  updatedAt: string;
}

interface DbRulesRow {
  kid_id: string | null;
  level1_json: string;
  level2_json: string;
  level3_json: string;
  updated_at: string;
}

export async function upsertRules(
  db: Db,
  accountId: string,
  kidId: string | null,
  config: RewardRulesConfig,
  updatedAt: string,
): Promise<void> {
  // The unique index is on (account_id, IFNULL(kid_id,'')). SQLite ON CONFLICT
  // needs concrete columns, so delete-then-insert keeps the "one row per scope"
  // invariant for both the NULL (all-kids) and per-kid cases.
  await db
    .prepare('DELETE FROM reward_rules WHERE account_id = ? AND IFNULL(kid_id, \'\') = IFNULL(?, \'\')')
    .bind(accountId, kidId)
    .run();
  await db
    .prepare('INSERT INTO reward_rules (id,account_id,kid_id,level1_json,level2_json,level3_json,updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(
      crypto.randomUUID(), accountId, kidId,
      JSON.stringify(config.level1), JSON.stringify(config.level2), JSON.stringify(config.level3),
      updatedAt,
    )
    .run();
}

export async function listRules(db: Db, accountId: string): Promise<RulesRow[]> {
  const { results } = await db
    .prepare('SELECT kid_id, level1_json, level2_json, level3_json, updated_at FROM reward_rules WHERE account_id = ?')
    .bind(accountId)
    .all<DbRulesRow>();
  return results.map(r => ({
    kidId: r.kid_id,
    config: {
      level1: JSON.parse(r.level1_json),
      level2: JSON.parse(r.level2_json),
      level3: JSON.parse(r.level3_json),
    },
    updatedAt: r.updated_at,
  }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run functions/_lib/rules/repo.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/rules/repo.ts functions/_lib/rules/repo.test.ts
git commit -m "feat(rules): reward-rules repository (upsert per scope, list)"
```

---

### Task 5: Reward-rules endpoints

**Files:**
- Create: `functions/api/rules/index.ts`
- Test: `functions/api/rules/rules.test.ts`

**Interfaces:**
- Consumes: `requireAccount`, rules repo + validator, kids repo (`getKid`), http helpers, `Env`.
- Produces:
  - `onRequestGet(ctx)` → `{ rules: RulesRow[] }` for the account.
  - `onRequestPut(ctx)` → **200** `{ ok: true }`. Body `{ kidId?: string | null; rules: <config> }`. Validates the config (400 `invalid_input` on bad shape); when `kidId` is a string, verifies the kid belongs to the account (404 `kid_not_found` otherwise).

- [ ] **Step 1: Write the failing test**

`functions/api/rules/rules.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as createKidRoute } from '../kids/index';
import { onRequestGet as getRules, onRequestPut as putRules } from './index';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});
const auth = () => ({ Authorization: `Bearer ${token}` });

const config = {
  level1: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '1 pound' },
  level2: { successDaysRequired: 5, weeklyReward: '10 pounds' },
  level3: { enabled: true, target: '2weeks', reward: 'shoes' },
};

const put = (body: unknown) => putRules({ request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify(body) }), env: { DB: db } });

describe('/api/rules', () => {
  it('requires authentication', async () => {
    const res = await getRules({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('stores all-kids rules and reads them back', async () => {
    expect((await put({ kidId: null, rules: config })).status).toBe(200);
    const res = await getRules({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { rules } = await res.json() as { rules: { kidId: string | null; config: typeof config }[] };
    expect(rules).toHaveLength(1);
    expect(rules[0].kidId).toBeNull();
    expect(rules[0].config.level3.reward).toBe('shoes');
  });

  it('rejects a malformed config with 400', async () => {
    expect((await put({ kidId: null, rules: { level1: {} } })).status).toBe(400);
  });

  it('rejects rules for a kid that is not yours with 404', async () => {
    expect((await put({ kidId: 'ghost', rules: config })).status).toBe(404);
  });

  it('stores per-kid rules for your own kid', async () => {
    const created = await createKidRoute({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }), env: { DB: db } });
    const { kid } = await created.json() as { kid: { id: string } };
    expect((await put({ kidId: kid.id, rules: config })).status).toBe(200);
    const res = await getRules({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { rules } = await res.json() as { rules: { kidId: string | null }[] };
    expect(rules.some(r => r.kidId === kid.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run functions/api/rules/rules.test.ts`
Expected: FAIL — module `./index` not found.

- [ ] **Step 3: Implement `functions/api/rules/index.ts`**

```ts
import type { Env } from '../../_lib/auth/types';
import { json, error, readJson } from '../../_lib/http';
import { requireAccount } from '../../_lib/auth/guard';
import { parseRewardRules } from '../../_lib/rules/validate';
import { upsertRules, listRules } from '../../_lib/rules/repo';
import { getKid } from '../../_lib/kids/repo';

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;
  return json({ rules: await listRules(ctx.env.DB, account.id) });
}

export async function onRequestPut(ctx: { request: Request; env: Env }): Promise<Response> {
  const account = await requireAccount(ctx.request, ctx.env.DB);
  if (account instanceof Response) return account;

  const body = await readJson<{ kidId?: string | null; rules?: unknown }>(ctx.request);
  const config = parseRewardRules(body?.rules);
  if (!config) return error(400, 'invalid_input');

  const kidId = body?.kidId ?? null;
  if (typeof kidId === 'string') {
    if (!(await getKid(ctx.env.DB, account.id, kidId))) return error(404, 'kid_not_found');
  }

  await upsertRules(ctx.env.DB, account.id, kidId, config, new Date().toISOString());
  return json({ ok: true });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run functions/api/rules/rules.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/api/rules/
git commit -m "feat(rules): authenticated reward-rules GET/PUT endpoints"
```

---

### Task 6: Full-suite green

**Files:** none (verification).

- [ ] **Step 1: Run the entire suite**

Run: `npx vitest run`
Expected: all prior tests plus the new kids/rules tests pass; the Phase 1 engine and Phase 2 auth suites are unchanged. Output pristine.

- [ ] **Step 2: If a pre-existing test flakes, re-run once**

Run: `npx vitest run`
Expected: green.

No commit (verification only).

---

## Self-Review

**Spec coverage (design doc: `/api/kids`, `/api/rules`, per-kid or all-kids rules):**
- `/api/kids` list/create/delete, account-scoped, auth-guarded → Tasks 1, 2. ✅
- `/api/rules` GET list + PUT upsert, per-kid or all-kids (`kid_id NULL`), auth-guarded → Tasks 4, 5. ✅
- Rules payload reuses engine `Level1/2/3Rule`; validated before storage → Task 3. ✅
- Cross-account isolation enforced in SQL `WHERE account_id = ?` → Tasks 1, 4 (+ tests asserting a foreign account can't read/delete). ✅
- PUT for a kid verifies ownership (404 otherwise) → Task 5. ✅
- Out of scope (later phases): the rules *screen* (frontend), session logging, dashboard, kid indicator, account timezone editing, account deletion. Intentional.

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✅

**Type consistency:** `Kid`, `RewardRulesConfig`, `RulesRow`, `requireAccount`, `createKid/listKids/getKid/deleteKid`, `upsertRules/listRules`, `parseRewardRules` are defined once and consumed with identical signatures downstream. Handler ctx shape `{ request; env: { DB } }` (+ `params.id` for `[id].ts`) matches the tests and the Pages Functions convention. The rules row's JSON columns (`level1_json/level2_json/level3_json`) match the Phase 1 schema. ✅
