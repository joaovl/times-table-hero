# Gamification Phase 1 — Data Foundation & Reward Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Cloudflare D1 schema and a pure, exhaustively-tested TypeScript reward engine that turns a kid's practice sessions + parent rules into daily/weekly/extended reward outcomes.

**Architecture:** A single `wrangler.toml` declares a D1 binding and SQL migrations create every table the feature needs. The reward engine is a pure module in `functions/_lib/rewards/` with no I/O — it takes rules + sessions + "now" and returns outcomes, so it is trivially unit-testable and later called from a Pages Function. No UI and no auth in this phase.

**Tech Stack:** TypeScript, Cloudflare D1 (SQLite), Wrangler CLI, Vitest.

## Global Constraints

- Reward engine is **pure**: no `Date.now()`, no DB, no `fetch`. "Now" is always passed in as an argument.
- All reward **numbers are parameters** from the rules object — never hardcoded thresholds.
- Reward **labels are free text** strings, passed through verbatim.
- Rule-change semantics: evaluation always uses the **current** rules over full history (recompute).
- Weeks are **Monday–Sunday** in the account's timezone (offset passed in `rules.timezoneOffsetMinutes`).
- `'month'` extended target is implemented as **4 consecutive successful weeks** (documented proxy).
- Node 18+, Vitest already configured (`environment: 'node'` by default in `vite.config.ts`).
- Do not touch the no-account local path; this phase adds files only.

---

### Task 1: Wrangler config + D1 migration schema

**Files:**
- Create: `wrangler.toml`
- Create: `migrations/0001_init.sql`
- Create: `package.json` scripts (Modify: `package.json` scripts block)

**Interfaces:**
- Consumes: nothing.
- Produces: a local D1 database named `DB` with tables `accounts`, `auth_sessions`, `kids`, `practice_sessions`, `reward_rules`, `reward_ledger`. Later phases bind to `env.DB`.

- [ ] **Step 1: Write `wrangler.toml`**

```toml
name = "times-table-hero"
compatibility_date = "2024-11-01"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "tth-db"
database_id = "local"   # replaced with the real id after `wrangler d1 create tth-db`
migrations_dir = "migrations"
```

- [ ] **Step 2: Write `migrations/0001_init.sql`**

```sql
-- Parent accounts. One account owns many kids and all their data.
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,      -- stored lowercased
  password_hash TEXT NOT NULL,             -- PBKDF2 derived key, base64
  salt          TEXT NOT NULL,             -- per-account random salt, base64
  tz_offset_min INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

-- Login sessions. token_hash = SHA-256 of the opaque session token.
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_auth_sessions_account ON auth_sessions(account_id);

CREATE TABLE kids (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_kids_account ON kids(account_id);

CREATE TABLE practice_sessions (
  id           TEXT PRIMARY KEY,          -- client-generated uuid (idempotent upload)
  kid_id       TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  started_at   TEXT NOT NULL,
  ended_at     TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  module       TEXT NOT NULL,
  correct      INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  topics_json  TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_sessions_kid ON practice_sessions(kid_id, started_at);

CREATE TABLE reward_rules (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kid_id          TEXT REFERENCES kids(id) ON DELETE CASCADE,  -- NULL = applies to all kids
  level1_json     TEXT NOT NULL,
  level2_json     TEXT NOT NULL,
  level3_json     TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_rules_scope ON reward_rules(account_id, IFNULL(kid_id, ''));

CREATE TABLE reward_ledger (
  id           TEXT PRIMARY KEY,
  kid_id       TEXT NOT NULL REFERENCES kids(id) ON DELETE CASCADE,
  period_type  TEXT NOT NULL,             -- 'day' | 'week' | 'extended'
  period_key   TEXT NOT NULL,             -- e.g. '2026-07-10', '2026-W28', '2026-W28+ext'
  reward_label TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'given'
  earned_at    TEXT NOT NULL,
  given_at     TEXT
);
CREATE UNIQUE INDEX idx_ledger_period ON reward_ledger(kid_id, period_type, period_key);
```

- [ ] **Step 3: Add DB scripts to `package.json`**

Add to the `"scripts"` block:

```json
    "db:migrate:local": "wrangler d1 migrations apply tth-db --local",
    "db:tables:local": "wrangler d1 execute tth-db --local --command \"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;\""
```

- [ ] **Step 4: Install wrangler (dev dependency)**

Run: `npm install -D wrangler`
Expected: wrangler added to devDependencies.

- [ ] **Step 5: Apply migration locally and verify tables**

Run: `npm run db:migrate:local && npm run db:tables:local`
Expected: output lists `accounts`, `auth_sessions`, `kids`, `practice_sessions`, `reward_ledger`, `reward_rules`.

- [ ] **Step 6: Commit**

```bash
git add wrangler.toml migrations/0001_init.sql package.json package-lock.json
git commit -m "feat(rewards): add D1 schema and wrangler config"
```

---

### Task 2: Reward engine types + local-day bucketing

**Files:**
- Create: `functions/_lib/rewards/types.ts`
- Create: `functions/_lib/rewards/days.ts`
- Test: `functions/_lib/rewards/days.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types `Level1Rule`, `Level2Rule`, `Level3Rule`, `RewardRules`, `PracticeSession`, `DayOutcome`, `EvaluateResult`.
  - `localDayKey(iso: string, tzOffsetMin: number): string` → `'YYYY-MM-DD'` in the account tz.
  - `groupByLocalDay(sessions: PracticeSession[], tzOffsetMin: number): Map<string, PracticeSession[]>`.

- [ ] **Step 1: Write the types file**

`functions/_lib/rewards/types.ts`:

```ts
export interface Level1Rule {
  // At least one goal field must be set; only set fields are required to pass.
  goal: { minutes?: number; exercises?: number; sessions?: number };
  score:
    | { kind: 'dailyPercent'; minPercent: number }
    | { kind: 'lastNAverage'; n: number; minPercent: number };
  weakTopics?: { topics: string[]; minPercent: number };
  dailyReward: string;
}

export interface Level2Rule {
  successDaysRequired: number; // out of 7 (Mon–Sun)
  weeklyReward: string;
}

export interface Level3Rule {
  enabled: boolean;
  target: '2weeks' | 'month'; // 'month' = 4 consecutive successful weeks
  reward: string;
}

export interface RewardRules {
  level1: Level1Rule;
  level2: Level2Rule;
  level3: Level3Rule;
  timezoneOffsetMinutes: number;
}

export interface PracticeSession {
  kidId: string;
  startedAt: string;   // ISO 8601
  durationSec: number;
  module: string;
  correct: number;
  total: number;
  topics: string[];
}

export type DayStatus = 'success' | 'missed' | 'pending';

export interface DayOutcome {
  date: string;        // 'YYYY-MM-DD' local
  status: DayStatus;
}

export interface EarnedReward {
  periodType: 'day' | 'week' | 'extended';
  periodKey: string;
  rewardLabel: string;
}

export interface EvaluateResult {
  days: DayOutcome[];
  weeklyStreakWeeks: number;
  extended: { enabled: boolean; target: '2weeks' | 'month'; met: boolean };
  earned: EarnedReward[];
}
```

- [ ] **Step 2: Write the failing test for `localDayKey` / `groupByLocalDay`**

`functions/_lib/rewards/days.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { localDayKey, groupByLocalDay } from './days';
import type { PracticeSession } from './types';

const mk = (startedAt: string): PracticeSession => ({
  kidId: 'k1', startedAt, durationSec: 60, module: 'times-tables',
  correct: 5, total: 5, topics: [],
});

describe('localDayKey', () => {
  it('uses UTC when offset is 0', () => {
    expect(localDayKey('2026-07-10T23:30:00Z', 0)).toBe('2026-07-10');
  });

  it('shifts across midnight for a positive (east) offset', () => {
    // +120 min → 01:30 next day local
    expect(localDayKey('2026-07-10T23:30:00Z', 120)).toBe('2026-07-11');
  });

  it('shifts back for a negative (west) offset', () => {
    // -300 min → 18:30 previous evening, still same date here
    expect(localDayKey('2026-07-10T01:30:00Z', -300)).toBe('2026-07-09');
  });
});

describe('groupByLocalDay', () => {
  it('buckets sessions into local-day keys', () => {
    const sessions = [mk('2026-07-10T10:00:00Z'), mk('2026-07-10T12:00:00Z'), mk('2026-07-11T09:00:00Z')];
    const g = groupByLocalDay(sessions, 0);
    expect(g.get('2026-07-10')?.length).toBe(2);
    expect(g.get('2026-07-11')?.length).toBe(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/rewards/days.test.ts`
Expected: FAIL — cannot find module `./days`.

- [ ] **Step 4: Implement `days.ts`**

`functions/_lib/rewards/days.ts`:

```ts
import type { PracticeSession } from './types';

/** 'YYYY-MM-DD' for the given instant in a timezone expressed as a minute offset. */
export function localDayKey(iso: string, tzOffsetMin: number): string {
  const shifted = new Date(new Date(iso).getTime() + tzOffsetMin * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function groupByLocalDay(
  sessions: PracticeSession[],
  tzOffsetMin: number,
): Map<string, PracticeSession[]> {
  const out = new Map<string, PracticeSession[]>();
  for (const s of sessions) {
    const key = localDayKey(s.startedAt, tzOffsetMin);
    const bucket = out.get(key);
    if (bucket) bucket.push(s);
    else out.set(key, [s]);
  }
  return out;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/rewards/days.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/rewards/types.ts functions/_lib/rewards/days.ts functions/_lib/rewards/days.test.ts
git commit -m "feat(rewards): engine types and local-day bucketing"
```

---

### Task 3: Level 1 daily success evaluation

**Files:**
- Create: `functions/_lib/rewards/day-eval.ts`
- Test: `functions/_lib/rewards/day-eval.test.ts`

**Interfaces:**
- Consumes: `Level1Rule`, `PracticeSession` from `./types`.
- Produces: `isDaySuccess(daySessions: PracticeSession[], rule: Level1Rule): boolean`.

- [ ] **Step 1: Write the failing test**

`functions/_lib/rewards/day-eval.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isDaySuccess } from './day-eval';
import type { Level1Rule, PracticeSession } from './types';

const session = (over: Partial<PracticeSession>): PracticeSession => ({
  kidId: 'k1', startedAt: '2026-07-10T10:00:00Z', durationSec: 600,
  module: 'times-tables', correct: 10, total: 10, topics: [], ...over,
});

const baseRule: Level1Rule = {
  goal: { minutes: 20 },
  score: { kind: 'dailyPercent', minPercent: 80 },
  dailyReward: '1 pound',
};

describe('isDaySuccess — goals', () => {
  it('fails when the time goal is not met', () => {
    // 10 min of practice vs 20 min required
    expect(isDaySuccess([session({ durationSec: 600 })], baseRule)).toBe(false);
  });

  it('passes when the time goal and score are met', () => {
    expect(isDaySuccess(
      [session({ durationSec: 1200 })], // 20 min, 100%
      baseRule,
    )).toBe(true);
  });

  it('requires every SET goal (time AND amount)', () => {
    const rule: Level1Rule = { ...baseRule, goal: { minutes: 20, exercises: 30 } };
    // 20 min but only 10 exercises → fails the amount goal
    expect(isDaySuccess([session({ durationSec: 1200, correct: 10, total: 10 })], rule)).toBe(false);
  });
});

describe('isDaySuccess — score', () => {
  it('dailyPercent aggregates across the day', () => {
    const rule: Level1Rule = { goal: { sessions: 2 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: 'x' };
    // 8/10 + 8/10 = 16/20 = 80% → pass
    expect(isDaySuccess([session({ correct: 8, total: 10 }), session({ correct: 8, total: 10 })], rule)).toBe(true);
    // 7/10 + 8/10 = 15/20 = 75% → fail
    expect(isDaySuccess([session({ correct: 7, total: 10 }), session({ correct: 8, total: 10 })], rule)).toBe(false);
  });

  it('lastNAverage averages the last N sessions of the day', () => {
    const rule: Level1Rule = { goal: { sessions: 1 }, score: { kind: 'lastNAverage', n: 2, minPercent: 100 }, dailyReward: 'x' };
    const s = [
      session({ startedAt: '2026-07-10T08:00:00Z', correct: 0, total: 10 }), // ignored (older)
      session({ startedAt: '2026-07-10T09:00:00Z', correct: 10, total: 10 }),
      session({ startedAt: '2026-07-10T10:00:00Z', correct: 10, total: 10 }),
    ];
    expect(isDaySuccess(s, rule)).toBe(true); // last 2 average 100%
  });
});

describe('isDaySuccess — weak topics', () => {
  const rule: Level1Rule = {
    goal: { sessions: 1 },
    score: { kind: 'dailyPercent', minPercent: 50 },
    weakTopics: { topics: ['mult-7'], minPercent: 90 },
    dailyReward: 'x',
  };

  it('enforces the stricter score only on sessions touching a weak topic', () => {
    // weak-topic session is 5/10 = 50% < 90% → fails despite overall passing
    expect(isDaySuccess([session({ correct: 5, total: 10, topics: ['mult-7'] })], rule)).toBe(false);
  });

  it('ignores the weak-topic rule when that topic was not practised', () => {
    expect(isDaySuccess([session({ correct: 6, total: 10, topics: ['mult-3'] })], rule)).toBe(true);
  });
});

describe('isDaySuccess — empty', () => {
  it('an empty day is never a success', () => {
    expect(isDaySuccess([], baseRule)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/rewards/day-eval.test.ts`
Expected: FAIL — cannot find module `./day-eval`.

- [ ] **Step 3: Implement `day-eval.ts`**

`functions/_lib/rewards/day-eval.ts`:

```ts
import type { Level1Rule, PracticeSession } from './types';

const pct = (correct: number, total: number): number =>
  total === 0 ? 0 : (correct / total) * 100;

function goalMet(day: PracticeSession[], goal: Level1Rule['goal']): boolean {
  const minutes = day.reduce((s, x) => s + x.durationSec, 0) / 60;
  const exercises = day.reduce((s, x) => s + x.total, 0);
  const sessions = day.length;
  if (goal.minutes !== undefined && minutes < goal.minutes) return false;
  if (goal.exercises !== undefined && exercises < goal.exercises) return false;
  if (goal.sessions !== undefined && sessions < goal.sessions) return false;
  return true;
}

function scoreMet(day: PracticeSession[], score: Level1Rule['score']): boolean {
  if (score.kind === 'dailyPercent') {
    const correct = day.reduce((s, x) => s + x.correct, 0);
    const total = day.reduce((s, x) => s + x.total, 0);
    return pct(correct, total) >= score.minPercent;
  }
  // lastNAverage: mean of the last N sessions' percentages (by startedAt).
  const ordered = [...day].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const lastN = ordered.slice(-score.n);
  const avg = lastN.reduce((s, x) => s + pct(x.correct, x.total), 0) / lastN.length;
  return avg >= score.minPercent;
}

function weakMet(day: PracticeSession[], weak: NonNullable<Level1Rule['weakTopics']>): boolean {
  const touching = day.filter(s => s.topics.some(t => weak.topics.includes(t)));
  if (touching.length === 0) return true; // not practised → not applicable
  const correct = touching.reduce((s, x) => s + x.correct, 0);
  const total = touching.reduce((s, x) => s + x.total, 0);
  return pct(correct, total) >= weak.minPercent;
}

export function isDaySuccess(daySessions: PracticeSession[], rule: Level1Rule): boolean {
  if (daySessions.length === 0) return false;
  if (!goalMet(daySessions, rule.goal)) return false;
  if (!scoreMet(daySessions, rule.score)) return false;
  if (rule.weakTopics && !weakMet(daySessions, rule.weakTopics)) return false;
  return true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/rewards/day-eval.test.ts`
Expected: PASS (9 assertions across the describe blocks).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/rewards/day-eval.ts functions/_lib/rewards/day-eval.test.ts
git commit -m "feat(rewards): level 1 daily success evaluation"
```

---

### Task 4: Week helpers (Mon–Sun keys, week series)

**Files:**
- Create: `functions/_lib/rewards/weeks.ts`
- Test: `functions/_lib/rewards/weeks.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `mondayOf(dateKey: string): string` → the `'YYYY-MM-DD'` of that week's Monday.
  - `isoWeekKey(dateKey: string): string` → `'YYYY-Www'`.
  - `dayKeysFrom(startKey: string, endKey: string): string[]` → inclusive list of daily keys.

- [ ] **Step 1: Write the failing test**

`functions/_lib/rewards/weeks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mondayOf, isoWeekKey, dayKeysFrom } from './weeks';

describe('mondayOf', () => {
  it('returns the same day for a Monday', () => {
    expect(mondayOf('2026-07-06')).toBe('2026-07-06'); // 2026-07-06 is a Monday
  });
  it('returns Monday for a Sunday', () => {
    expect(mondayOf('2026-07-12')).toBe('2026-07-06'); // Sunday → prior Monday
  });
});

describe('isoWeekKey', () => {
  it('formats an ISO week', () => {
    expect(isoWeekKey('2026-07-10')).toBe('2026-W28');
  });
});

describe('dayKeysFrom', () => {
  it('lists inclusive day keys', () => {
    expect(dayKeysFrom('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11', '2026-07-12']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/rewards/weeks.test.ts`
Expected: FAIL — cannot find module `./weeks`.

- [ ] **Step 3: Implement `weeks.ts`**

`functions/_lib/rewards/weeks.ts`:

```ts
const MS_DAY = 86_400_000;

const toUTC = (dateKey: string): Date => new Date(dateKey + 'T00:00:00Z');
const toKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Monday (ISO weekday 1) of the week containing dateKey. */
export function mondayOf(dateKey: string): string {
  const d = toUTC(dateKey);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return toKey(new Date(d.getTime() - dow * MS_DAY));
}

/** ISO-8601 week key like '2026-W28'. */
export function isoWeekKey(dateKey: string): string {
  const d = toUTC(dateKey);
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d.getTime() + (3 - day) * MS_DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / (7 * MS_DAY)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Inclusive list of 'YYYY-MM-DD' keys from start to end. */
export function dayKeysFrom(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(startKey).getTime(); t <= toUTC(endKey).getTime(); t += MS_DAY) {
    out.push(toKey(new Date(t)));
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/rewards/weeks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/rewards/weeks.ts functions/_lib/rewards/weeks.test.ts
git commit -m "feat(rewards): Monday-based week helpers"
```

---

### Task 5: Full engine — days, streaks, extended, earned rewards

**Files:**
- Create: `functions/_lib/rewards/index.ts`
- Test: `functions/_lib/rewards/index.test.ts`

**Interfaces:**
- Consumes: `groupByLocalDay`, `localDayKey` (`./days`); `isDaySuccess` (`./day-eval`); `mondayOf`, `isoWeekKey`, `dayKeysFrom` (`./weeks`); all types.
- Produces: `evaluate(rules: RewardRules, sessions: PracticeSession[], now: Date): EvaluateResult`.

- [ ] **Step 1: Write the failing test**

`functions/_lib/rewards/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluate } from './index';
import type { PracticeSession, RewardRules } from './types';

const rules: RewardRules = {
  level1: { goal: { sessions: 1 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '1 pound' },
  level2: { successDaysRequired: 5, weeklyReward: '10 pounds' },
  level3: { enabled: true, target: '2weeks', reward: 'shoes' },
  timezoneOffsetMinutes: 0,
};

// A perfect session on a given local day.
const win = (date: string): PracticeSession => ({
  kidId: 'k1', startedAt: `${date}T10:00:00Z`, durationSec: 600,
  module: 'times-tables', correct: 10, total: 10, topics: [],
});

describe('evaluate — days', () => {
  it('marks played-and-passed days success, gaps missed, and today pending when unplayed', () => {
    const now = new Date('2026-07-08T12:00:00Z'); // Wednesday
    const sessions = [win('2026-07-06'), win('2026-07-07')]; // Mon, Tue
    const r = evaluate(rules, sessions, now);
    const byDate = Object.fromEntries(r.days.map(d => [d.date, d.status]));
    expect(byDate['2026-07-06']).toBe('success');
    expect(byDate['2026-07-07']).toBe('success');
    expect(byDate['2026-07-08']).toBe('pending'); // today, not yet played
  });

  it('a low-score day is missed, not success', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const weak: PracticeSession = { ...win('2026-07-06'), correct: 5, total: 10 };
    const r = evaluate(rules, [weak], now);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('missed');
  });
});

describe('evaluate — weekly streak + earned', () => {
  it('earns the weekly reward when success days reach the threshold', () => {
    const now = new Date('2026-07-13T12:00:00Z'); // Monday of the next week
    // Mon–Fri of week 2026-W28 all won (5 days)
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const r = evaluate(rules, days.map(win), now);
    expect(r.weeklyStreakWeeks).toBe(1);
    expect(r.earned.some(e => e.periodType === 'week' && e.rewardLabel === '10 pounds')).toBe(true);
  });

  it('does not earn the weekly reward below the threshold', () => {
    const now = new Date('2026-07-13T12:00:00Z');
    const days = ['2026-07-06', '2026-07-07', '2026-07-08']; // only 3
    const r = evaluate(rules, days.map(win), now);
    expect(r.weeklyStreakWeeks).toBe(0);
    expect(r.earned.some(e => e.periodType === 'week')).toBe(false);
  });
});

describe('evaluate — extended', () => {
  it('unlocks the extended reward after 2 consecutive successful weeks', () => {
    const now = new Date('2026-07-20T12:00:00Z'); // Monday after two full weeks
    const wk1 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const wk2 = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    const r = evaluate(rules, [...wk1, ...wk2].map(win), now);
    expect(r.extended.met).toBe(true);
    expect(r.earned.some(e => e.periodType === 'extended' && e.rewardLabel === 'shoes')).toBe(true);
  });

  it('stays locked when disabled', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const off: RewardRules = { ...rules, level3: { ...rules.level3, enabled: false } };
    const wk1 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const wk2 = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    const r = evaluate(off, [...wk1, ...wk2].map(win), now);
    expect(r.extended.met).toBe(false);
    expect(r.earned.some(e => e.periodType === 'extended')).toBe(false);
  });
});

describe('evaluate — recompute after a mid-week rule change', () => {
  it('re-evaluates history under the new (stricter) rules', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const day = win('2026-07-06'); // 100%
    const strict: RewardRules = {
      ...rules,
      level1: { ...rules.level1, goal: { minutes: 20 } }, // needs 20 min; the session is 10 min
    };
    const r = evaluate(strict, [day], now);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('missed');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/_lib/rewards/index.test.ts`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 3: Implement `index.ts`**

`functions/_lib/rewards/index.ts`:

```ts
import type {
  RewardRules, PracticeSession, EvaluateResult, DayOutcome, EarnedReward,
} from './types';
import { groupByLocalDay, localDayKey } from './days';
import { isDaySuccess } from './day-eval';
import { mondayOf, isoWeekKey, dayKeysFrom } from './weeks';

export function evaluate(
  rules: RewardRules,
  sessions: PracticeSession[],
  now: Date,
): EvaluateResult {
  const tz = rules.timezoneOffsetMinutes;
  const todayKey = localDayKey(now.toISOString(), tz);
  const byDay = groupByLocalDay(sessions, tz);

  // Day series from first activity to today.
  const playedKeys = [...byDay.keys()].sort();
  const startKey = playedKeys.length ? playedKeys[0] : todayKey;
  const allDayKeys = dayKeysFrom(startKey, todayKey);

  const daySuccess = new Map<string, boolean>();
  const days: DayOutcome[] = allDayKeys.map(date => {
    const played = byDay.get(date) ?? [];
    const success = isDaySuccess(played, rules.level1);
    daySuccess.set(date, success);
    let status: DayOutcome['status'];
    if (success) status = 'success';
    else if (date === todayKey) status = 'pending';
    else status = 'missed';
    return { date, status };
  });

  const earned: EarnedReward[] = [];

  // Level 1: a reward per successful day.
  for (const d of days) {
    if (d.status === 'success') {
      earned.push({ periodType: 'day', periodKey: d.date, rewardLabel: rules.level1.dailyReward });
    }
  }

  // Group day success by Monday-based week; a week is "complete" if its Monday
  // is strictly before this week's Monday.
  const thisMonday = mondayOf(todayKey);
  const weekSuccessDays = new Map<string, number>(); // mondayKey -> success count
  for (const date of allDayKeys) {
    const wk = mondayOf(date);
    const inc = daySuccess.get(date) ? 1 : 0;
    weekSuccessDays.set(wk, (weekSuccessDays.get(wk) ?? 0) + inc);
  }

  const completedWeeks = [...weekSuccessDays.keys()].filter(m => m < thisMonday).sort();
  const weekMet = (mondayKey: string): boolean =>
    (weekSuccessDays.get(mondayKey) ?? 0) >= rules.level2.successDaysRequired;

  // Level 2: earned weekly reward for each completed week meeting the threshold.
  for (const m of completedWeeks) {
    if (weekMet(m)) {
      earned.push({ periodType: 'week', periodKey: isoWeekKey(m), rewardLabel: rules.level2.weeklyReward });
    }
  }

  // Weekly streak = consecutive most-recent completed weeks that met the goal.
  let weeklyStreakWeeks = 0;
  for (let i = completedWeeks.length - 1; i >= 0; i--) {
    if (weekMet(completedWeeks[i])) weeklyStreakWeeks++;
    else break;
  }

  // Level 3: extended reward.
  const need = rules.level3.target === '2weeks' ? 2 : 4;
  const met = rules.level3.enabled && weeklyStreakWeeks >= need;
  if (met) {
    const anchor = completedWeeks[completedWeeks.length - 1];
    earned.push({
      periodType: 'extended',
      periodKey: `${isoWeekKey(anchor)}+ext`,
      rewardLabel: rules.level3.reward,
    });
  }

  return {
    days,
    weeklyStreakWeeks,
    extended: { enabled: rules.level3.enabled, target: rules.level3.target, met },
    earned,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/_lib/rewards/index.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Run the whole engine suite + typecheck-adjacent sanity**

Run: `npx vitest run functions/_lib/rewards/`
Expected: PASS (days, day-eval, weeks, index).

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/rewards/index.ts functions/_lib/rewards/index.test.ts
git commit -m "feat(rewards): full evaluate() — days, weekly streak, extended, earned"
```

---

### Task 6: Ensure Vitest discovers the new test folder

**Files:**
- Modify: `vite.config.ts` (only if `functions/**` tests are not picked up)

**Interfaces:**
- Consumes: nothing.
- Produces: green `npx vitest run` including `functions/_lib/rewards/*`.

- [ ] **Step 1: Run the full suite and confirm the new tests are included**

Run: `npx vitest run`
Expected: the four `functions/_lib/rewards/*.test.ts` files appear in the run and pass, alongside the existing suite. Vitest's default `include` is `**/*.{test,spec}.*`, so no config change should be needed.

- [ ] **Step 2: If (and only if) the functions tests are NOT collected, widen include**

Add to the `test` block in `vite.config.ts`:

```ts
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'functions/**/*.{test,spec}.ts'],
```

- [ ] **Step 3: Re-run and confirm**

Run: `npx vitest run`
Expected: PASS, functions tests included.

- [ ] **Step 4: Commit (only if the config changed)**

```bash
git add vite.config.ts
git commit -m "test(rewards): include functions tests in vitest run"
```

---

## Self-Review

**Spec coverage (Phase 1 scope only):**
- D1 schema for accounts, auth_sessions, kids, practice_sessions, reward_rules, reward_ledger → Task 1. ✅
- Pure reward engine, all three levels, weak topics, free-text rewards, editable numbers → Tasks 2–5. ✅
- Rule-change = recompute against current rules → covered by the Task 5 mid-week test. ✅
- Monday–Sunday weeks in account tz → Tasks 2 & 4. ✅
- `'month'` = 4 consecutive weeks → Task 5 (`need = 4`) + Global Constraints. ✅
- Idempotent ledger period keys → `idx_ledger_period` unique index (Task 1) + stable `periodKey`s (Task 5). ✅
- Out of Phase 1 (later plans): auth endpoints, rules API/UI, session logging in modules, dashboard, kid indicator, PRIVACY.md rewrite, native bearer wiring. Intentionally deferred.

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✅

**Type consistency:** `evaluate`, `isDaySuccess`, `groupByLocalDay`, `localDayKey`, `mondayOf`, `isoWeekKey`, `dayKeysFrom`, and all `types.ts` names are used identically across tasks. `EarnedReward.periodType` values (`'day'|'week'|'extended'`) match the `reward_ledger.period_type` domain. ✅
