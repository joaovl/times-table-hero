# Proportional Reward Balance — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** A parent can set an accruing "TV-hours" reward that scales with practice, and see the computed balance per kid on a dashboard, verified end-to-end in a real browser.

**Architecture:** New pure engine fn `computeBalance`; rules gain a `mode` union; new `/api/sessions` + `/api/dashboard`; a dashboard page; the bribe-area form gains balance-mode fields. Reuses the existing engine + auth + repo patterns.

## Global Constraints
- Earn = `max(⌊min/minPerUnit⌋, ⌊ex/exPerUnit⌋) × rewardPerUnit` on a qualified day (`0` per-unit disables that basis); no cap.
- Qualified = existing goal + score (+weak) gate via `isDaySuccess`.
- Non-qualified past day = `−penaltyPerMissedDay`; today-not-qualified = 0; balance may go negative.
- Missing `mode` on a stored rule = `fixed` (backward compatible).
- Engine stays pure (now passed in). Endpoints auth-guarded + kid-ownership scoped. New files only + additive edits.

---

### Task 1: Engine `computeBalance`

**Files:** Create `functions/_lib/rewards/balance.ts`, `functions/_lib/rewards/balance.test.ts`.

**Interfaces:**
- `BalanceRule = { unitLabel: string; minutesPerUnit: number; exercisesPerUnit: number; rewardPerUnit: number; penaltyPerMissedDay: number }`
- `BalanceGate = Omit<Level1Rule, 'dailyReward'>` (i.e. `{ goal; score; weakTopics? }`)
- `computeBalance(gate, balance, sessions, now, tzOffsetMinutes): { balanceUnits: number; days: { date: string; units: number; status: 'earned'|'missed'|'pending' }[] }`

- [ ] **Step 1 — failing test** `balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBalance, type BalanceRule } from './balance';
import type { PracticeSession, Level1Rule } from './types';

const gate: Omit<Level1Rule, 'dailyReward'> = {
  goal: { minutes: 20 },
  score: { kind: 'dailyPercent', minPercent: 50 },
};
const rule: BalanceRule = { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 };

const sess = (date: string, durationSec: number, correct: number, total: number): PracticeSession => ({
  kidId: 'k', startedAt: `${date}T10:00:00Z`, durationSec, module: 'times-tables', correct, total, topics: [],
});

describe('computeBalance', () => {
  it('earns the greater of the time and count bases', () => {
    // 60 min -> floor(60/20)=3 ; 10 exercises -> floor(10/10)=1 ; max=3
    const now = new Date('2026-07-07T12:00:00Z');
    const r = computeBalance(gate, rule, [sess('2026-07-06', 3600, 10, 10)], now, 0);
    expect(r.balanceUnits).toBe(3);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('earned');
  });

  it('does not cap earnings', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const r = computeBalance(gate, rule, [sess('2026-07-06', 3600 * 3, 10, 10)], now, 0); // 180 min -> 9
    expect(r.balanceUnits).toBe(9);
  });

  it('subtracts a penalty for a missed (no-practice) past day', () => {
    const now = new Date('2026-07-08T12:00:00Z'); // today = 07-08
    // 07-06 earns +1 (20 min), 07-07 no practice -> -1 ; balance 0
    const r = computeBalance(gate, rule, [sess('2026-07-06', 1200, 10, 10)], now, 0);
    expect(r.days.find(d => d.date === '2026-07-07')?.status).toBe('missed');
    expect(r.balanceUnits).toBe(0);
  });

  it('takes away when the score gate fails despite time', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    // 40 min but 2/10 = 20% < 50% -> not qualified -> -1 (it is not "today")? 07-06 < 07-07 so missed
    const r = computeBalance(gate, rule, [sess('2026-07-06', 2400, 2, 10)], now, 0);
    expect(r.balanceUnits).toBe(-1);
  });

  it('gives today 0 (pending) when not yet qualified, no penalty', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    const r = computeBalance(gate, rule, [], now, 0);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('pending');
    expect(r.balanceUnits).toBe(0);
  });

  it('honours a disabled basis (0 per-unit)', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const timeOnly: BalanceRule = { ...rule, exercisesPerUnit: 0 };
    // 25 min -> floor(25/20)=1 ; count basis disabled
    const r = computeBalance(gate, timeOnly, [sess('2026-07-06', 1500, 100, 100)], now, 0);
    expect(r.balanceUnits).toBe(1);
  });
});
```

- [ ] **Step 2 — run, expect fail** (`npx vitest run functions/_lib/rewards/balance.test.ts`).

- [ ] **Step 3 — implement `balance.ts`:**

```ts
import type { Level1Rule, PracticeSession } from './types';
import { groupByLocalDay, localDayKey } from './days';
import { dayKeysFrom } from './weeks';
import { isDaySuccess } from './day-eval';

export interface BalanceRule {
  unitLabel: string;
  minutesPerUnit: number;
  exercisesPerUnit: number;
  rewardPerUnit: number;
  penaltyPerMissedDay: number;
}

export type BalanceGate = Omit<Level1Rule, 'dailyReward'>;

export interface BalanceDay { date: string; units: number; status: 'earned' | 'missed' | 'pending' }
export interface BalanceResult { balanceUnits: number; days: BalanceDay[] }

export function computeBalance(
  gate: BalanceGate,
  balance: BalanceRule,
  sessions: PracticeSession[],
  now: Date,
  tzOffsetMinutes: number,
): BalanceResult {
  const todayKey = localDayKey(now.toISOString(), tzOffsetMinutes);
  const byDay = groupByLocalDay(sessions, tzOffsetMinutes);
  const played = [...byDay.keys()].sort();
  const startKey = played.length ? played[0] : todayKey;
  const allDays = dayKeysFrom(startKey, todayKey);

  const days: BalanceDay[] = allDays.map(date => {
    const day = byDay.get(date) ?? [];
    const qualified = isDaySuccess(day, { ...gate, dailyReward: '' });
    if (qualified) {
      const minutes = day.reduce((s, x) => s + x.durationSec, 0) / 60;
      const exercises = day.reduce((s, x) => s + x.total, 0);
      const byTime = balance.minutesPerUnit > 0 ? Math.floor(minutes / balance.minutesPerUnit) : 0;
      const byCount = balance.exercisesPerUnit > 0 ? Math.floor(exercises / balance.exercisesPerUnit) : 0;
      return { date, units: Math.max(byTime, byCount) * balance.rewardPerUnit, status: 'earned' };
    }
    if (date < todayKey) return { date, units: -balance.penaltyPerMissedDay, status: 'missed' };
    return { date, units: 0, status: 'pending' };
  });

  return { balanceUnits: days.reduce((s, d) => s + d.units, 0), days };
}
```

- [ ] **Step 4 — run, expect pass.**
- [ ] **Step 5 — commit** `feat(rewards): computeBalance for proportional TV-hours rewards`.

---

### Task 2: Rules config union + validator

**Files:** Modify `src/lib/rewards-types.ts`, `functions/_lib/rules/types.ts`, `functions/_lib/rules/validate.ts`; extend `functions/_lib/rules/validate.test.ts`.

**Interfaces:** `Level1Rule` (web + rules config) becomes:
```ts
interface Level1Gate { goal; score; weakTopics? }
interface Level1Fixed extends Level1Gate { mode?: 'fixed'; dailyReward: string }
interface Level1Balance extends Level1Gate { mode: 'balance'; balance: BalanceRule }
type Level1 = Level1Fixed | Level1Balance
```
(`mode` optional on fixed for backward compat.)

- [ ] **Step 1 — extend `src/lib/rewards-types.ts`:** add `BalanceRule` and make `Level1Rule` the union above; keep `DEFAULT_RULES.level1` as fixed (add `mode: 'fixed'`). Add `DEFAULT_BALANCE: BalanceRule = { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 }`.

- [ ] **Step 2 — mirror types in `functions/_lib/rules/types.ts`** (its `RewardRulesConfig.level1` uses the engine `Level1Rule` + a `BalanceRule`; simplest: define the union locally there too, or import `BalanceRule` from `../rewards/balance`). Use `../rewards/balance`'s `BalanceRule` and the engine `Level1Rule` gate.

- [ ] **Step 3 — failing validator tests** (add to `validate.test.ts`): a balance-mode config parses; a balance config missing `minutesPerUnit` (or negative) is rejected; a fixed config with no `mode` still parses.

```ts
it('accepts balance mode', () => {
  const cfg = { level1: { mode: 'balance', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } }, level2: { successDaysRequired: 5, weeklyReward: 'x' }, level3: { enabled: false, target: '2weeks', reward: 'x' } };
  expect(parseRewardRules(cfg)).not.toBeNull();
});
it('rejects balance mode with a negative rate', () => {
  const cfg = { level1: { mode: 'balance', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, balance: { unitLabel: 'x', minutesPerUnit: -1, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } }, level2: { successDaysRequired: 5, weeklyReward: 'x' }, level3: { enabled: false, target: '2weeks', reward: 'x' } };
  expect(parseRewardRules(cfg)).toBeNull();
});
```

- [ ] **Step 4 — implement** in `validate.ts`: split `parseLevel1` into gate-parsing + a mode branch. Fixed (no `mode` or `mode==='fixed'`) requires `dailyReward` string. Balance (`mode==='balance'`) requires `balance` object with `unitLabel` non-empty string and `minutesPerUnit/exercisesPerUnit/rewardPerUnit/penaltyPerMissedDay` finite numbers `>= 0`.

- [ ] **Step 5 — run validator tests, expect pass. Step 6 — commit** `feat(rules): validate fixed|balance reward modes`.

---

### Task 3: Sessions repo + endpoint

**Files:** Create `functions/_lib/sessions/repo.ts`, `functions/api/sessions/index.ts`, `functions/api/sessions/sessions.test.ts`.

**Interfaces:**
- `insertSessions(db, kidId, sessions: SessionInput[]): Promise<void>` (INSERT OR IGNORE by id).
- `listSessions(db, kidId): Promise<PracticeSessionRow[]>`.
- `SessionInput = { id; startedAt; endedAt; durationSec; module; correct; total; topics: string[] }`.
- `onRequestPost(ctx)` — auth + kid-ownership; 201 `{ inserted: n }`; 404 kid not yours; 400 malformed; 401 unauth.

- [ ] **Step 1 — failing test** (`sessions.test.ts`): signup → create kid → POST 2 sessions → 201; a second POST of the same ids is idempotent (still one row each); POST for a ghost kid → 404; no auth → 401. Assert via a direct `listSessions` import.

- [ ] **Step 2 — implement repo** (`repo.ts`): topics stored as JSON. `insertSessions` loops `INSERT OR IGNORE INTO practice_sessions (...) VALUES (...)`. `listSessions` maps rows (parse topics_json) to `PracticeSession` shape (with `kidId`).

- [ ] **Step 3 — implement endpoint** using `requireAccount` + `getKid` ownership, `readJson`, validate array, `insertSessions`.

- [ ] **Step 4 — run, expect pass. Step 5 — commit** `feat(sessions): practice-session logging endpoint`.

---

### Task 4: Effective-rule resolver + dashboard endpoint

**Files:** Create `functions/_lib/rules/effective.ts` (+ test), `functions/api/dashboard/index.ts`, `functions/api/dashboard/dashboard.test.ts`.

**Interfaces:**
- `resolveEffective(rows: RulesRow[], kidId: string): RewardRulesConfig | null` — the per-kid row if present, else the all-kids row, else null.
- `onRequestGet(ctx)` — auth + kid ownership; loads sessions + rules + account tz; if the effective rule's level1 is balance → `{ mode:'balance', unitLabel, balanceUnits, days }` (via `computeBalance`); if fixed → `{ mode:'fixed', earned, days }` (via `evaluate`); if no rule → `{ mode:'none' }`.

- [ ] **Step 1 — failing test** (`dashboard.test.ts`): signup → kid → PUT a balance rule for the kid → POST sessions (a +3 day, a missed day) → GET dashboard → `mode==='balance'`, `unitLabel==='hours of TV'`, `balanceUnits` equals the expected sum; ownership 404; auth 401. Also: a fixed rule → `mode==='fixed'`.

- [ ] **Step 2 — implement `resolveEffective`** + test.
- [ ] **Step 3 — implement dashboard endpoint.** Read `accounts.tz_offset_min` (add `getAccountTz(db, accountId)` to auth repo, or reuse the account from `requireAccount` which already has `tzOffsetMin`). Use `requireAccount`'s returned account tz. Load rules via `listRules`, sessions via `listSessions`, resolve effective, branch on `level1.mode`.
- [ ] **Step 4 — run, expect pass. Step 5 — commit** `feat(dashboard): per-kid reward dashboard endpoint`.

---

### Task 5: Client + dashboard page + form balance mode

**Files:** Modify `src/lib/api/client.ts` (+ `sessionsLog`, `dashboardGet`), create `src/pages/parent/Dashboard.tsx` (+ test), modify `RewardRulesForm.tsx` (+ test) for balance mode, modify `ParentHome.tsx` (link) + `App.tsx` (route).

- [ ] **Step 1** — client: `interface DashboardData` union; `dashboardGet(kidId): Promise<DashboardData>`; `sessionsLog(kidId, sessions): Promise<void>` (used by E2E/tests). (+ client test mocking fetch.)
- [ ] **Step 2** — `RewardRulesForm`: add a "Reward type" select (`fixed` | `balance`). In balance mode, show unitLabel + the four numbers; switching modes seeds sensible defaults (`DEFAULT_BALANCE`). (+ test: switch to balance reveals fields; editing minutesPerUnit fires onChange with the number.)
- [ ] **Step 3** — `Dashboard.tsx`: kid selector; on select, `dashboardGet`; render headline (`{balanceUnits} {unitLabel}`) + per-day list. Gate on load. (+ test mocking client: shows "3 hours of TV".)
- [ ] **Step 4** — wire `/parent/dashboard` route + `ParentHome` link.
- [ ] **Step 5** — run the new component tests + full `npx vitest run` green. **Commit** `feat(web): reward dashboard + balance-mode rules form`.

---

### Task 6: Headed E2E of the TV-hours math

**Files:** Create `e2e/reward-balance.spec.ts`.

- [ ] **Step 1** — spec: sign up → add kid "Mia" → `/parent/rewards`, choose **Earned balance**, set unit "hours of TV", 20 min/unit, 10 ex/unit, reward 1, penalty 1, goal 20 min, score 50% → Save. Read the bearer token from `localStorage` (`page.evaluate`), then `page.request.post('/api/sessions', ...)` three sessions relative to today (UTC): 3 days ago 20 min@100% (+1), 2 days ago none (missed, −1), 1 day ago 60 min@100% (+3). Open `/parent/dashboard`, select "Mia", assert headline shows **"3 hours of TV"**.

- [ ] **Step 2** — run headless: `npx playwright test reward-balance` → pass.
- [ ] **Step 3** — run headed for the user: `PWSLOW=400 npx playwright test reward-balance --headed`.
- [ ] **Step 4** — commit `test(e2e): TV-hours balance computed live in the dashboard`.

---

### Task 7: Full green
- [ ] `npx vitest run` (all unit) + `npx playwright test` (all E2E) green; `npm run build` OK.

## Self-Review
- Model (earn max(time,count), no cap, score-gated, penalty on miss, negative ok) → Task 1 tests. ✅
- Config union + validation both modes → Task 2. ✅
- Log practice + compute balance end to end → Tasks 3–4. ✅
- Parent configures + sees it → Task 5; watched in Chrome → Task 6. ✅
- Backward compat (missing mode = fixed) → Task 2 validator + engine untouched. ✅
- Types: `BalanceRule`, `BalanceGate`, `computeBalance`, `resolveEffective`, `DashboardData` used consistently across tasks.
