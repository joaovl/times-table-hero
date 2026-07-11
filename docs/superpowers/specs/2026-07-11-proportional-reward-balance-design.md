# Proportional Reward Balance ("TV-hours") — Design

**Date:** 2026-07-11
**Status:** Approved (verbal) — spec of record

## Goal

Replace the binary "meet the goal → get one fixed reward" model (as an option)
with a **proportional, accruing reward balance**: practice earns units of a
reward (e.g. hours of TV) in proportion to how much she does, a poor/skipped day
**subtracts** from a running balance, and the balance is shown on a parent
dashboard. Confirmed rules:

- **Earn** (on a qualified day) = `max(⌊minutes / minutesPerUnit⌋, ⌊exercises / exercisesPerUnit⌋) × rewardPerUnit`
  — whichever of time or count gives more. **No cap.**
- **Qualified** = the day meets the existing daily **goal** AND **score** (and
  weak-topic) requirement.
- **Take-away** = a non-qualified past day subtracts `penaltyPerMissedDay` from
  the balance. The balance may go **negative**.

## Reward model (per scope: all-kids or a specific kid)

A rule's Level 1 gains a **mode**:

- `fixed` (existing): goal + score gate → a free-text `dailyReward` when met.
- `balance` (new): goal + score gate, plus a `balance` block:
  - `unitLabel: string` — e.g. "hours of TV"
  - `minutesPerUnit: number` — e.g. 20 (`0` disables the time basis)
  - `exercisesPerUnit: number` — e.g. 10 (`0` disables the count basis)
  - `rewardPerUnit: number` — e.g. 1
  - `penaltyPerMissedDay: number` — e.g. 1 (`0` disables take-away)

Per local day D (account timezone), from that day's practice sessions:

```
qualified = goal met AND score met AND (weak-topic ok)
if qualified:  units(D) = max(
                 minutesPerUnit  > 0 ? floor(dayMinutes   / minutesPerUnit ) : 0,
                 exercisesPerUnit> 0 ? floor(dayExercises  / exercisesPerUnit) : 0
               ) * rewardPerUnit
else if D is before today:  units(D) = -penaltyPerMissedDay      // take-away
else (today, not yet qualified):  units(D) = 0                    // pending
balance = sum of units(D) over the first-activity..today range
```

`dayMinutes = Σ durationSec / 60`, `dayExercises = Σ total`.

## Architecture (units, each testable)

### 1. Engine — `functions/_lib/rewards/balance.ts`
Pure function:
```
computeBalance(
  gate: { goal; score; weakTopics? },      // reuses Level1Rule's gate fields
  balance: BalanceRule,
  sessions: PracticeSession[],
  now: Date,
  tzOffsetMinutes: number,
): { balanceUnits: number; days: { date: string; units: number; status: 'earned'|'missed'|'pending' }[] }
```
Reuses `groupByLocalDay`, `localDayKey`, `dayKeysFrom`, and `isDaySuccess`
(qualification = `isDaySuccess(daySessions, { ...gate, dailyReward: '' })`, which
already ignores the reward label). The engine's existing `Level1Rule`, `evaluate`,
and `isDaySuccess` are unchanged.

### 2. Rules config + validator (web + functions)
- Web `RewardRulesConfig.level1` becomes a discriminated union on `mode`
  (`'fixed' | 'balance'`); a missing `mode` is treated as `'fixed'` (backward
  compatible with rows already stored).
- `functions/_lib/rules/validate.ts` `parseRewardRules` accepts both modes;
  `balance` mode requires the five numeric/label fields (numbers ≥ 0, non-empty
  `unitLabel`).

### 3. Sessions API — `functions/api/sessions/index.ts`
`POST /api/sessions` (auth): body `{ kidId, sessions: [{ id, startedAt, endedAt,
durationSec, module, correct, total, topics }] }`. Verifies the kid belongs to
the account, then `INSERT OR IGNORE`s each session (idempotent by `id`). Repo:
`functions/_lib/sessions/repo.ts` — `insertSessions(db, kidId, sessions)`,
`listSessions(db, kidId)`.

### 4. Dashboard API — `functions/api/dashboard/index.ts`
`GET /api/dashboard?kidId=` (auth, kid ownership). Loads the kid's sessions, the
**effective** rule (per-kid row, else all-kids row), and the account timezone.
For `balance` mode → returns `{ mode:'balance', unitLabel, balanceUnits, days }`.
For `fixed` mode → returns `{ mode:'fixed', earned: EarnedReward[], days }` from
the existing `evaluate`.

### 5. Dashboard page — `src/pages/parent/Dashboard.tsx`
`/parent/dashboard` (behind `RequireAuth`): a kid selector; for the chosen kid,
shows the headline balance ("Sam has **3 hours of TV**") and a per-day list
(earned / missed / pending). Linked from `ParentHome`.

### 6. Bribe-area form
`RewardRulesForm` gets a **reward-type** selector: "One fixed reward" (current)
or "Earned balance (e.g. TV time)". In balance mode it shows the five rate
fields. `DEFAULT_RULES` stays `fixed`.

## Data flow

Kid practices → (future: modules auto-log; now: `/api/sessions`) → D1
`practice_sessions`. Parent opens dashboard → `GET /api/dashboard` runs
`computeBalance` over those sessions + the effective rule → balance shown.

## Testing

- **Engine** (`balance.test.ts`): earn = max(time,count); no cap; score-gate
  fails → take-away; missed past day → −penalty; today not-qualified → 0; empty;
  disabled bases (`0`). Exhaustive vitest.
- **Validator**: accepts balance mode, rejects missing/negative rate fields.
- **Sessions/dashboard API**: integration via the node:sqlite adapter — post
  sessions, get dashboard, assert computed balance; ownership 404; auth 401.
- **Form**: switching to balance mode reveals the rate fields and edits them.
- **Headed E2E** (`e2e/reward-balance.spec.ts`): sign up → add kid → set balance
  rule (20 min/unit, 10 ex/unit, reward 1, penalty 1, "hours of TV") → POST a few
  days of sessions incl. one skipped day → open the dashboard → assert the
  headline balance computes correctly (e.g. +1 −1 +3 = **3 hours of TV**). Run in
  a real Chrome window.
- Existing 1727 unit tests + 3 E2E stay green.

## Out of scope (follow-ups)
- Auto-logging from the 15 modules (the E2E logs via the API to prove the math).
- Per-day "active days" config (penalty currently applies to every non-qualified
  past day; set `penaltyPerMissedDay: 0` to disable).
- Level 2/3 interaction with balance mode (weekly/extended stay label-based).

## Backward compatibility
Rows stored without `mode` load as `fixed`; the existing fixed flow, its tests,
and the current bribe-area behavior are unchanged.
