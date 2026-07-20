# Full Regression Coverage — Design

**Date:** 2026-07-20
**Status:** Draft for review
**Author:** Claude (Opus 4.8) with joaovl

## Problem

The suite has broad *structural* coverage (95 unit files; every module's
`logic.ts` is tested; a `play-skill-coverage` smoke test mounts all 15
modules) but almost no *behavioural* coverage of gameplay. Concretely:

1. **No test answers a question.** `play-skill-coverage` only asserts "a
   question renders and an input exists." Nothing verifies that the correct
   answer is *accepted*, that the correct option is *present among the
   choices*, or that the on-screen rendering does not *leak or contradict*
   the answer. The charts value-label bug (answer printed on the queried bar;
   compare/total showing numbers that aren't the answer) shipped and reshipped
   because no test could see it.
2. **`npm run typecheck` is red.** ~8 pre-existing `tsc` errors mean
   TypeScript regressions are not caught at all. At least one
   (`TimePlay` reading `settings.difficulty`, which does not exist) is a real
   runtime bug.
3. **The e2e layer is thin.** 13 specs, covering parent/rewards/sign-in flows
   plus two targeted bug regressions. No test plays a module to completion.

## Goal

A layered regression suite that proves, for **every play area**, that a child
can play it and be graded correctly — and that catches answer-integrity and
rendering regressions in `npm test` (fast) and `npm run test:e2e` (full stack).

Success = these all pass and are meaningful:
- `npm run typecheck` — green (gateable).
- `npm test` — every module × skill: correct answer accepted, correct option
  present when choices show, no visual give-away.
- `npm run test:e2e` — an auto-player completes a real game in every module.

## Non-Goals

- No new gameplay features or curriculum changes.
- No visual redesign (the charts fix already shipped separately).
- Not chasing 100% line coverage; targeting *behavioural* coverage of the
  answer path.

## Architecture

Four layers. Layer 0 is a prerequisite; 1–3 are the coverage.

```
Layer 0  Green typecheck        (fix ~8 tsc errors, incl. 1 real bug)
Layer 1  Answer-integrity       (unit/jsdom, npm test) — the core net
Layer 2  Visual component tests (unit/jsdom, npm test)
Layer 3  e2e auto-player        (Playwright, real stack) — every-area functional
```

### The common contract (the linchpin)

Module logic is heterogeneous: generators are named
`generateQuestions` / `generateArithQuestions` / `generateShapeQuestions` /
…; graders are `isAnswerCorrect` / `checkArithAnswer` / `checkMoneyAnswer` /
`gradeOpAnswer` / …; answers are numbers, `Frac`, strings, or arrays. So we
introduce **one thin adapter per module** that normalises to a single shape,
and drive all generic tests through the adapter registry.

```ts
// src/lib/testkit/moduleContract.ts
export interface PlayableModule<S, Q> {
  slug: string;                       // hub slug, e.g. 'charts'
  skills: string[];                   // every skill/operation a user can pick
  settingsFor(skill: string): S;      // single-skill settings (mirrors DEFAULT_SETTINGS)
  generate(settings: S, count: number): Q[];
  /** Canonical correct answer string a knowing player would enter/pick. */
  correctAnswer(q: Q): string;
  /** Grade a candidate answer string exactly as the Play component does. */
  isCorrect(q: Q, answer: string): boolean;
  /** Buttons shown for this question, or [] when the skill uses typed input. */
  choices(q: Q): string[];
  /** Indices whose value the renderer must NOT print (answer give-aways). */
  hiddenValueIndices?(q: Q): number[];
}
```

Adapters live in `src/lib/testkit/modules/<slug>.ts` and are collected in
`src/lib/testkit/registry.ts` as `ALL_MODULES: PlayableModule[]`. Adapters
contain **no test logic** — only wiring to existing `logic.ts` exports and the
same settings factories already in `play-skill-coverage.test.tsx` (which will
be refactored to consume the registry, removing duplication).

The existing `E2EOracle` / `oracle.ts` pattern (charts, fractions) is the
runtime-DOM analogue of this contract and is what Layer 3 uses; where a module
already has an `oracle.ts`, the adapter reuses it.

## Layer 0 — Green typecheck

Fix every current `tsc` error. Enumerated:

| File | Error | Fix |
|------|-------|-----|
| `shapes/logic.ts:1004` | `Difficulty` unknown in `generateChoices` | use `ShapeDifficulty` |
| `time/logic.ts:807` | `Difficulty` unknown | use `TimeArithDifficulty` |
| `word-problems/logic.ts:919` | `Difficulty` unknown | use the module's difficulty type |
| `time/TimePlay.tsx:79,80,295` | reads `settings.difficulty` (absent) | use `settings.arithDifficulty` (**real bug**) |
| `parent/RewardRulesForm.tsx:70` | union widening (`n` on `dailyPercent`) | narrow before assign |
| `pages/WhosPlaying.test.tsx:9,13,29,36` | wrong mock type args | correct the mock typing |
| `vite.config.ts:102` | `test` not in `UserConfigExport` | import config from `vitest/config` |

Each fix is TDD where behaviour changes (TimePlay difficulty): add a failing
test that the time MC spread honours the selected difficulty, then fix.

Add `"typecheck": "tsc -b --noEmit"` to the CI gate (already an npm script).

## Layer 1 — Answer-integrity harness

`src/lib/testkit/answerIntegrity.test.tsx`, parameterised over `ALL_MODULES`.
For each module × skill, generate K=25 questions (fixed-seed where a module
supports it; otherwise K raised to 50 for statistical coverage) and assert:

1. **Correct answer accepted:** `isCorrect(q, correctAnswer(q)) === true`.
2. **Correct option present:** if `choices(q)` is non-empty, it contains a
   value the grader accepts (catches "the answer isn't among the buttons").
3. **Exactly one correct option:** exactly one of `choices(q)` grades correct
   (or the `None of these` sentinel is the sole correct pick when the answer
   is intentionally hidden).
4. **No give-away:** for any renderer that prints data values, the value at
   each `hiddenValueIndices(q)` is not shown (generalises the charts fix).
5. **Distinct-enough distractors:** no duplicate option strings.

A failing module fails with its slug + skill + the offending question JSON.

## Layer 2 — Visual component tests

For every custom SVG/visual renderer, a `*.test.tsx` that renders with known
data and asserts answer-integrity + basic a11y (`role="img"` + `aria-label`):

- `charts/BarChart.test.tsx` (done), add `LineChart.test.tsx`,
  `PieChart.test.tsx` (slice values present for pie-fraction; asked
  value hidden for read-line).
- `shapes` visual (shape figure shows no dimension that is the answer unless
  the skill intends it), `time` clock face, any number-line renderer.

Scope: one test file per renderer that displays data the question asks about.
Renderers that show only labels (no answer values) get a render+a11y smoke
test only.

## Layer 3 — e2e auto-player

Two parts:

**(a) Oracle rollout.** Every module's Play renders
`<E2EOracle data={moduleOracle(q, choices)} />` (guarded by `E2E_ENABLED`, as
charts/fractions already do) and ships an `oracle.ts` producing `OracleData`.
13 modules to add; mechanical, one per module, each reusing its adapter's
`correctAnswer`/`choices`.

**(b) Generic player spec.** `e2e/auto-player.spec.ts`: for each module,
start a game (via the module's setup, reusing `e2e/support/play.ts` helpers)
and loop — read the oracle, submit the correct answer (click the correct
choice or type `expected`), assert the score increments and the question id
advances — until the game completes. Asserts every correct answer scores and
the results screen renders. One test per module (parameterised), so a broken
area names itself.

Keep the existing targeted bug specs; extend `charts-no-clue` to also assert
(via oracle) that the answer value is not printed on the queried bar.

## File structure

```
src/lib/testkit/
  moduleContract.ts          # PlayableModule interface
  registry.ts                # ALL_MODULES
  modules/<slug>.ts          # 15 adapters
  answerIntegrity.test.tsx   # Layer 1
src/modules/<slug>/*.test.tsx # Layer 2 visual tests (co-located)
src/modules/<slug>/oracle.ts  # Layer 3 oracle (13 new)
e2e/auto-player.spec.ts        # Layer 3 player
```

## Testing approach

- Layers 0–2 run in `npm test` (vitest/jsdom), no server; fast enough for the
  pre-commit loop.
- Layer 3 runs in `npm run test:e2e` against `wrangler pages dev` + local D1,
  as today.
- TDD throughout: for the charts-class bugs and the TimePlay difficulty bug,
  write the failing assertion first.

## Risks / decisions

- **Randomised generators:** K questions per skill gives probabilistic, not
  exhaustive, coverage. Acceptable — the harness runs every skill on every CI
  run, so flakes surface fast; where a module exposes a seed we use it.
- **Adapter drift:** an adapter could wire the wrong grader and mask a bug.
  Mitigated by Layer 3 driving the *real* Play component through the DOM
  oracle, which cannot diverge from what the user sees.
- **Scope size:** ~15 adapters + 13 oracle rollouts + visual tests. Executed
  as one plan via subagent-driven development, module-by-module, so each task
  is independently reviewable.
```
