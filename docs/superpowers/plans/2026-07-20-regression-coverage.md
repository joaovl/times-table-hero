# Full Regression Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a layered regression suite that proves every play area is answerable and correctly graded, and make `npm run typecheck` green so TS regressions are caught.

**Architecture:** A per-module adapter normalises heterogeneous `logic.ts` exports to one `PlayableModule` contract. A generic answer-integrity test (Layer 1) and a generic e2e auto-player (Layer 3) drive all modules through that registry; visual component tests (Layer 2) guard renderers that display answer data. Layer 0 fixes the pre-existing type errors first.

**Tech Stack:** TypeScript, React, Vite, Vitest + @testing-library/react (jsdom), Playwright (real stack via `wrangler pages dev` + local D1).

## Global Constraints

- Test framework for Layers 0–2: Vitest with `@testing-library/react`; component tests start with `// @vitest-environment jsdom`.
- Every generic assertion iterates the registry `ALL_MODULES`; no test hard-codes a single module except the exemplar wiring in Task 3.
- Adapters contain wiring only — no assertions, no question generation logic of their own; they call existing `logic.ts` exports.
- The E2E oracle element must stay behind `E2E_ENABLED` (from `@/lib/e2e/env`) so it never ships to real users — mirror `src/lib/e2e/oracle.tsx` `E2EOracle` usage in `ChartsPlay.tsx`.
- Difficulty values are always the literal union `'easy' | 'medium' | 'hard'`.
- Each module's canonical single-skill settings mirror its storage `DEFAULT_SETTINGS`; reuse the factories currently in `src/__tests__/play-skill-coverage.test.tsx` (moved into the testkit in Task 2).
- Commit after each task with a `test:` or `fix:` or `feat:` prefixed message.
- Run `npx vitest run <path>` for a single file; `npm test` (== `vitest run` in CI) for the full suite.

### Module export reference (harvested — use verbatim)

| slug | skills export | generate fn | grade fn | choices fn | Settings type | difficulty field |
|------|---------------|-------------|----------|------------|---------------|------------------|
| times-tables | *(operations)* `['multiply','divide','square','sqrt','all']` | `generateQuestions` | `checkAnswer`* | `generateChoices`* | `GameSettings` | `difficulty` |
| arithmetic | *(operations)* `['add','subtract','multiply','divide','all']` | `generateArithQuestions` | `checkArithAnswer` | `generateArithChoices` | `ArithSettings` | `difficulty` |
| fractions | `ALL_SKILLS` | `generateFractionQuestions` | `gradeOpAnswer`/`isAnswerCorrect`* | *(typed)* | `FractionSettings` | n/a (`simplify`) |
| shapes | `SHAPE_SKILL_OPTIONS` | `generateShapeQuestions` | `isAnswerCorrect` | `generateChoices` | `ShapeSettings` | `difficulty` (`ShapeDifficulty`) |
| decimals | `ALL_SKILLS` | `generateDecimalsQuestions` | `checkNumericAnswer`/`checkFractionAnswer`/`checkOrderAnswer` | *(typed/visual)* | `DecimalsSettings` | n/a |
| money | `MONEY_SKILL_OPTIONS` | `generateMoneyQuestions` | `checkMoneyAnswer`/`checkCompareAnswer` | *(typed)* | `MoneySettings` | `difficulty` |
| number-sense | `ALL_SKILLS` | `generateNumberSenseQuestions` | `checkNumberSenseAnswer` | `generateChoices` | `NumberSenseSettings` | `difficulty` |
| number-theory | `NUMBER_THEORY_SKILL_OPTIONS` | `generateNumberTheoryQuestions` | `isAnswerCorrect` | `generateChoices`* | `NumberTheorySettings` | `difficulty` |
| conversions | `CONVERSION_SKILL_OPTIONS` | `generateConversionQuestions` | `isAnswerCorrect` | `generateChoices` | `ConversionSettings` | `difficulty` |
| word-problems | `WORD_SKILL_OPTIONS` | `generateWordQuestions` | `checkWordAnswer` | `generateChoices` | `WordSettings` | `difficulty` (`WordDifficulty`) |
| ratio-proportion | `ALL_SKILLS` | `generateRatioQuestions` | `checkRatioAnswer` | `generateRatioChoices` | `RatioSettings` | `difficulty` |
| algebra | `ALL_SKILLS` | `generateAlgebraQuestions` | `checkAlgebraAnswer` | `generateChoices` | `AlgebraSettings` | `difficulty` |
| statistics | `ALL_SKILLS` | `generateStatsQuestions` | `checkStatsAnswer` | `generateChoices` | `StatsSettings` | `difficulty` |
| time | `TIME_SKILL_OPTIONS` | `generateTimeQuestions` | `isAnswerCorrect` | `generateChoices` | `TimeSettings` | `arithDifficulty` (`TimeArithDifficulty`) |
| charts | `CHART_SKILL_OPTIONS` | `generateChartQuestions` | `isAnswerCorrect` | `generateChartChoices` | `ChartSettings` | n/a (`maxValue`) |

`*` = the exact export must be confirmed by the implementer by reading the module's `logic.ts` (name harvested may differ for a couple of modules whose grader/choices weren't in the grep window: times-tables `checkAnswer`/`generateChoices`, number-theory `generateChoices`, fractions `isAnswerCorrect`). The adapter task for that module includes a step to read the file and wire the real name.

---

## File Structure

- `src/lib/testkit/moduleContract.ts` — `PlayableModule` interface + `AnswerMode`.
- `src/lib/testkit/settings.ts` — the 15 single-skill settings factories (moved from `play-skill-coverage.test.tsx`).
- `src/lib/testkit/modules/<slug>.ts` — 15 adapters.
- `src/lib/testkit/registry.ts` — `ALL_MODULES: PlayableModule[]`.
- `src/lib/testkit/answerIntegrity.test.tsx` — Layer 1 generic test.
- `src/modules/<slug>/{LineChart,PieChart,...}.test.tsx` — Layer 2 visual tests.
- `src/modules/<slug>/oracle.ts` — Layer 3 oracle (13 new; charts + fractions exist).
- `e2e/auto-player.spec.ts` — Layer 3 player.

---

## Task 1: Green typecheck + TimePlay difficulty bug

**Files:**
- Modify: `src/modules/shapes/logic.ts:1004`, `src/modules/time/logic.ts:807`, `src/modules/word-problems/logic.ts:919`
- Modify: `src/modules/time/TimePlay.tsx:79-80,295`
- Modify: `src/pages/parent/RewardRulesForm.tsx:70`
- Modify: `src/pages/WhosPlaying.test.tsx:9,13,29,36`
- Modify: `vite.config.ts:102`
- Test: `src/modules/time/TimePlay.difficulty.test.tsx` (new)

**Interfaces:**
- Produces: nothing consumed by later tasks; unblocks `npm run typecheck`.

- [ ] **Step 1: Write the failing test** for the real bug — the time MC uses the selected difficulty spread.

```tsx
// @vitest-environment jsdom
// src/modules/time/TimePlay.difficulty.test.tsx
import { describe, it, expect } from 'vitest';
import { generateChoices, generateTimeQuestions } from './logic';
import type { TimeSettings } from './logic';

// spreadFor('easy') = 9, spreadFor('medium'/'hard') = 3, so easy options span
// a wider range than medium. This pins that generateChoices honours the
// difficulty it is given (the bug: TimePlay passed settings.difficulty, which
// is undefined -> always the medium spread).
function widthOf(opts: string[]): number {
  const ns = opts.map(Number).filter(n => Number.isFinite(n));
  return Math.max(...ns) - Math.min(...ns);
}

describe('time MC honours difficulty', () => {
  it('easy spread is at least as wide as medium across samples', () => {
    const base: TimeSettings = {
      skills: ['arith-add'] as TimeSettings['skills'],
      precisions: ['hour', 'half', 'quarter', '5min'],
      format: '12h', numerals: 'arabic', arithDifficulty: 'easy',
      gameMode: 'questions', questionCount: 20, timeLimit: 60,
    };
    let easyWins = 0, n = 0;
    for (const q of generateTimeQuestions(base, 20)) {
      const easy = generateChoices(q, 'easy');
      const med = generateChoices(q, 'medium');
      if (easy.length >= 2 && med.length >= 2) { n++; if (widthOf(easy) >= widthOf(med)) easyWins++; }
    }
    expect(n).toBeGreaterThan(0);
    expect(easyWins / n).toBeGreaterThan(0.7);
  });
});
```

- [ ] **Step 2: Run the test — it should PASS already** (logic is correct; the bug is in TimePlay wiring, not `generateChoices`). This test guards the fix in Step 3 from regressing the logic.

Run: `npx vitest run src/modules/time/TimePlay.difficulty.test.tsx`
Expected: PASS.

- [ ] **Step 3: Fix the type errors and the TimePlay wiring.**

`src/modules/shapes/logic.ts:1004` — change `difficulty: Difficulty` to `difficulty: ShapeDifficulty`.
`src/modules/time/logic.ts:807` — change `difficulty: Difficulty` to `difficulty: TimeArithDifficulty`.
`src/modules/word-problems/logic.ts:919` — change `difficulty: Difficulty` to `difficulty: WordDifficulty`.

`src/modules/time/TimePlay.tsx` lines 79-80 and 295 — replace `settings.difficulty` with `settings.arithDifficulty` (TimeSettings has no `difficulty` field):

```tsx
setChoices(settings.arithDifficulty !== 'hard'
  ? generateChoices(questions[currentIndex], settings.arithDifficulty)
  : []);
```
and at line ~295:
```tsx
settings.arithDifficulty !== 'hard' && choices.length > 0 ? (
```

`src/pages/parent/RewardRulesForm.tsx:70` — read the surrounding code; the object literal assigns `n` to a union arm that lacks it. Narrow on `kind` before building the object so `n` is only set on the `lastNAverage` arm. Example shape:
```tsx
const rule = kind === 'lastNAverage'
  ? { kind: 'lastNAverage' as const, n, minPercent }
  : { kind: 'dailyPercent' as const, minPercent };
```

`src/pages/WhosPlaying.test.tsx` — the mock uses two type args / wrong arg types. Read the file; fix the `vi.fn`/mock generic to match the mocked function's real signature (single type arg or none), and pass correctly-typed arguments.

`vite.config.ts:102` — the `test` key needs Vitest's config typing. Change the top import to:
```ts
import { defineConfig } from 'vitest/config';
```
(remove the `vite` `defineConfig` import if now unused).

- [ ] **Step 4: Verify typecheck is green.**

Run: `npx tsc -b --noEmit`
Expected: no errors printed, exit 0.

- [ ] **Step 5: Run the guard test + a broad smoke.**

Run: `npx vitest run src/modules/time/ src/pages/parent/RewardRulesForm.test.tsx src/pages/WhosPlaying.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "fix(types): green typecheck; TimePlay uses arithDifficulty for MC spread"
```

---

## Task 2: PlayableModule contract, settings factories, empty registry

**Files:**
- Create: `src/lib/testkit/moduleContract.ts`
- Create: `src/lib/testkit/settings.ts`
- Create: `src/lib/testkit/registry.ts`
- Modify: `src/__tests__/play-skill-coverage.test.tsx` (import factories from testkit instead of defining inline)
- Test: `src/lib/testkit/registry.test.ts`

**Interfaces:**
- Produces:
  - `PlayableModule<S, Q>` (interface below).
  - `ALL_MODULES: PlayableModule<any, any>[]` (empty array initially).
  - Settings factories: `fractionSettings(skill)`, `shapeSettings(skill)`, `timesTablesSettings(op)`, `arithmeticSettings(op)`, `timeSettings(skill)`, `chartsSettings(skill)`, `numberSenseSettings(skill)`, `moneySettings(skill)`, `decimalsSettings(skill)`, `numberTheorySettings(skill)`, `conversionsSettings(skill)`, `wordProblemsSettings(skill)`, `ratioSettings(skill)`, `algebraSettings(skill)`, `statisticsSettings(skill)` — signatures identical to those currently in `play-skill-coverage.test.tsx`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/testkit/registry.test.ts
import { describe, it, expect } from 'vitest';
import { ALL_MODULES } from './registry';

describe('registry', () => {
  it('is an array (grows as adapters land)', () => {
    expect(Array.isArray(ALL_MODULES)).toBe(true);
  });
  it('every adapter exposes the contract surface', () => {
    for (const m of ALL_MODULES) {
      expect(typeof m.slug).toBe('string');
      expect(Array.isArray(m.skills)).toBe(true);
      expect(typeof m.generate).toBe('function');
      expect(typeof m.correctAnswer).toBe('function');
      expect(typeof m.isCorrect).toBe('function');
      expect(typeof m.choices).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npx vitest run src/lib/testkit/registry.test.ts`
Expected: FAIL — `Cannot find module './registry'`.

- [ ] **Step 3: Create the contract.**

```ts
// src/lib/testkit/moduleContract.ts
export interface PlayableModule<S, Q> {
  /** Hub slug, e.g. 'charts'. */
  slug: string;
  /** Every skill/operation a user can select. */
  skills: string[];
  /** Single-skill settings mirroring the module's DEFAULT_SETTINGS. */
  settingsFor(skill: string): S;
  /** Generate `count` questions for the given settings. */
  generate(settings: S, count: number): Q[];
  /** Canonical correct-answer string a knowing player would enter or pick. */
  correctAnswer(q: Q): string;
  /** Grade a candidate answer string exactly as the Play component does. */
  isCorrect(q: Q, answer: string): boolean;
  /** Buttons shown for this question; [] when the skill uses typed input. */
  choices(q: Q): string[];
  /** Indices whose value the renderer must NOT print (answer give-aways). */
  hiddenValueIndices?(q: Q): number[];
}
```

- [ ] **Step 4: Create `settings.ts`** by moving the 15 factory functions verbatim from `src/__tests__/play-skill-coverage.test.tsx` (lines ~93-258). Export each. Keep the same imports (module Settings/Skill types). Then update `play-skill-coverage.test.tsx` to `import { fractionSettings, shapeSettings, ... } from '@/lib/testkit/settings';` and delete the inline copies.

- [ ] **Step 5: Create the empty registry.**

```ts
// src/lib/testkit/registry.ts
import type { PlayableModule } from './moduleContract';

// Adapters are appended here as they land (Tasks 3-8).
export const ALL_MODULES: PlayableModule<any, any>[] = [];
```

- [ ] **Step 6: Run tests.**

Run: `npx vitest run src/lib/testkit/registry.test.ts src/__tests__/play-skill-coverage.test.tsx`
Expected: PASS (registry test green; smoke test still green after the import move).

- [ ] **Step 7: Commit.**

```bash
git add -A
git commit -m "test(testkit): PlayableModule contract, shared settings factories, empty registry"
```

---

## Task 3: Answer-integrity harness + charts adapter (exemplar)

**Files:**
- Create: `src/lib/testkit/modules/charts.ts`
- Modify: `src/lib/testkit/registry.ts` (register charts)
- Create: `src/lib/testkit/answerIntegrity.test.tsx`

**Interfaces:**
- Consumes: `PlayableModule` (Task 2), `chartsSettings` (Task 2), charts `logic.ts` exports: `CHART_SKILL_OPTIONS`, `generateChartQuestions`, `isAnswerCorrect`, `generateChartChoices`, `chartHideValueIndices`, and the oracle helper's expected-string logic.
- Produces: the generic harness that every later adapter is validated by; the charts adapter as the copy-me exemplar.

- [ ] **Step 1: Write the charts adapter.**

```ts
// src/lib/testkit/modules/charts.ts
import type { PlayableModule } from '../moduleContract';
import { chartsSettings } from '../settings';
import {
  CHART_SKILL_OPTIONS, generateChartQuestions, isAnswerCorrect,
  generateChartChoices, chartHideValueIndices,
  type ChartQuestion, type ChartSettings,
} from '@/modules/charts/logic';

// Canonical answer string per expectedKind (mirrors ChartsPlay.formatCorrectAnswer
// and chartOracle.expectedString).
function correctAnswer(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  if (kind === 'trend' && q.expectedTrend) return q.expectedTrend;
  if (kind === 'time' && q.expectedTime) return q.expectedTime;
  return String(q.answer);
}

export const chartsModule: PlayableModule<ChartSettings, ChartQuestion> = {
  slug: 'charts',
  skills: [...CHART_SKILL_OPTIONS],
  settingsFor: chartsSettings,
  generate: (s, n) => generateChartQuestions(s, n),
  correctAnswer,
  isCorrect: (q, a) => isAnswerCorrect(q, a),
  choices: (q) => generateChartChoices(q, 'easy'),
  hiddenValueIndices: (q) => chartHideValueIndices(q),
};
```

- [ ] **Step 2: Register it.**

```ts
// src/lib/testkit/registry.ts
import type { PlayableModule } from './moduleContract';
import { chartsModule } from './modules/charts';

export const ALL_MODULES: PlayableModule<any, any>[] = [
  chartsModule,
];
```

- [ ] **Step 3: Write the harness (the failing test lives here — it must exercise the contract).**

```tsx
// @vitest-environment jsdom
// src/lib/testkit/answerIntegrity.test.tsx
import { describe, it, expect } from 'vitest';
import { ALL_MODULES } from './registry';

const K = 25;

for (const m of ALL_MODULES) {
  describe(`answer integrity: ${m.slug}`, () => {
    for (const skill of m.skills) {
      it(`"${skill}" — correct answer is accepted, options are sound, no give-away`, () => {
        const qs = m.generate(m.settingsFor(skill), K);
        expect(qs.length, 'generator produced questions').toBeGreaterThan(0);
        for (const q of qs) {
          const correct = m.correctAnswer(q);

          // 1. The canonical answer grades correct.
          expect(m.isCorrect(q, correct), `${m.slug}/${skill} rejected its own answer: ${JSON.stringify(q)}`).toBe(true);

          // 2/3. If choices show, exactly one grades correct (or 'None of these'
          // is the sole correct pick when the true answer is hidden).
          const choices = m.choices(q);
          if (choices.length > 0) {
            const correctCount = choices.filter(c => c !== 'None of these' && m.isCorrect(q, c)).length;
            const noneIsCorrect = choices.includes('None of these')
              && choices.every(c => c === 'None of these' || !m.isCorrect(q, c));
            expect(correctCount === 1 || noneIsCorrect, `${m.slug}/${skill} choices unsound: ${JSON.stringify({ choices, q })}`).toBe(true);
            // No duplicate option strings.
            expect(new Set(choices).size, `${m.slug}/${skill} duplicate options`).toBe(choices.length);
          }
        }
      });
    }
  });
}

// Guard against an empty registry silently passing.
it('registry is non-empty', () => { expect(ALL_MODULES.length).toBeGreaterThan(0); });
```

- [ ] **Step 4: Run the harness.**

Run: `npx vitest run src/lib/testkit/answerIntegrity.test.tsx`
Expected: PASS for charts across all `CHART_SKILL_OPTIONS`. If any charts skill fails, that is a real bug — fix the charts logic, not the test.

- [ ] **Step 5: Commit.**

```bash
git add -A
git commit -m "test(testkit): answer-integrity harness + charts adapter (exemplar)"
```

---

## Tasks 4–8: Adapters for the remaining 14 modules

Each task adds a group of adapters following the **Task 3 exemplar exactly**, then registers them so the Task 3 harness covers them. Use the export names from the reference table. For any name marked `*`, the FIRST step is to open the module's `logic.ts` and confirm the real export name.

The adapter differences per module are only: (a) imports, (b) `slug`, (c) `skills` source, (d) `generate`/`isCorrect`/`choices` wiring, (e) `correctAnswer`, (f) `settingsFor`. `hiddenValueIndices` is omitted (only charts and the Layer-2 renderers need it).

**`correctAnswer` rules by answer shape:**
- numeric answer on `q.answer`: `String(q.answer)`.
- answer needs a unit (e.g. word-problems `q.unit ? \`${q.answer} ${q.unit}\` : String(q.answer)`): mirror the module's `expectedAnswerString`/`answerString` helper — read it and reuse its exact formatting.
- `Frac` answer (fractions): `` `${a.num}/${a.den}` `` (see `src/modules/fractions/oracle.ts`).
- string/label/time answers: reuse the module's own canonical-answer helper.

**Grouping (one commit per task):**

### Task 4: arithmetic, times-tables, number-sense
- Create `src/lib/testkit/modules/{arithmetic,timesTables,numberSense}.ts`.
- arithmetic: `skills` = `['add','subtract','multiply','divide','all']`, `settingsFor` = `arithmeticSettings`, `generate` = `generateArithQuestions`, `isCorrect` = `(q,a)=>checkArithAnswer(q, a)` — READ `checkArithAnswer`'s signature; it may take a parsed number, in which case parse `a` the way `ArithmeticPlay` does. `choices` = `generateArithChoices(q,'easy')`. `correctAnswer` = the module's answer string helper.
- times-tables: `skills` = `['multiply','divide','square','sqrt','all']`, `settingsFor` = `timesTablesSettings`, `generate` = `generateQuestions`. READ `logic.ts` for the grader + choices export names (`*`) and wire them; `correctAnswer` from `q.answer`.
- number-sense: `skills` = `[...ALL_SKILLS]`, `settingsFor` = `numberSenseSettings`, `generate` = `generateNumberSenseQuestions`, `isCorrect` = `checkNumberSenseAnswer`, `choices` = `generateChoices(q,'easy')`.
- Register all three in `registry.ts`.
- [ ] Write adapters → [ ] register → [ ] `npx vitest run src/lib/testkit/answerIntegrity.test.tsx` (PASS; real failures = real bugs, fix the module) → [ ] commit `test(testkit): adapters for arithmetic, times-tables, number-sense`.

### Task 5: money, decimals, number-theory
- money: `MONEY_SKILL_OPTIONS`, `generateMoneyQuestions`, grader `checkMoneyAnswer`/`checkCompareAnswer` (branch on skill — READ `MoneyPlay.tsx` to see which grader each skill uses and how the typed value is parsed to pence), `choices` typed → `[]` unless `MoneyPlay` builds them (read it).
- decimals: `ALL_SKILLS`, `generateDecimalsQuestions`, grader branches (`checkNumericAnswer`/`checkFractionAnswer`/`checkOrderAnswer`) by `q` kind — READ `DecimalsPlay.tsx` for the mapping and `correctAnswer` per kind.
- number-theory: `NUMBER_THEORY_SKILL_OPTIONS`, `generateNumberTheoryQuestions`, `isAnswerCorrect`, `generateChoices`* (confirm name).
- Register; run harness; commit `test(testkit): adapters for money, decimals, number-theory`.

### Task 6: conversions, word-problems, ratio-proportion
- conversions: `CONVERSION_SKILL_OPTIONS`, `generateConversionQuestions`, `isAnswerCorrect`, `generateChoices`.
- word-problems: `WORD_SKILL_OPTIONS`, `generateWordQuestions`, `checkWordAnswer`, `generateChoices`; `correctAnswer` = `q.unit ? \`${q.answer} ${q.unit}\` : String(q.answer)` (confirm against `expectedAnswerString`).
- ratio-proportion: `ALL_SKILLS`, `generateRatioQuestions`, `checkRatioAnswer`, `generateRatioChoices`.
- Register; run harness; commit `test(testkit): adapters for conversions, word-problems, ratio-proportion`.

### Task 7: algebra, statistics, time
- algebra: `ALL_SKILLS`, `generateAlgebraQuestions`, `checkAlgebraAnswer`, `generateChoices`.
- statistics: `ALL_SKILLS`, `generateStatsQuestions`, `checkStatsAnswer`, `generateChoices`.
- time: `TIME_SKILL_OPTIONS`, `generateTimeQuestions`, `isAnswerCorrect`, `generateChoices`; `correctAnswer` = read `expectedAnswerString`/`isAnswerCorrect` to produce the canonical HH:MM or numeric string.
- Register; run harness; commit `test(testkit): adapters for algebra, statistics, time`.

### Task 8: fractions
- fractions: `ALL_SKILLS`, `generateFractionQuestions`. Fractions grade via `gradeOpAnswer(value, answer, simplify)` for op-questions and `isAnswerCorrect` for others — READ `FractionsPlay.tsx` to map each skill to its grader and how the typed `"n/d"` becomes a `Frac`. `correctAnswer` = `` `${a.num}/${a.den}` `` for op skills (see `oracle.ts`); for non-fraction answers reuse the module helper. `choices` = `[]` (typed).
- Register; run harness; commit `test(testkit): fractions adapter — all 15 modules under answer integrity`.

---

## Tasks 9–10: Layer 2 visual component tests

### Task 9: LineChart + PieChart answer-integrity
**Files:** Create `src/modules/charts/LineChart.test.tsx`, `src/modules/charts/PieChart.test.tsx`.

- [ ] **Step 1:** LineChart test — mirror `BarChart.test.tsx`. Assert: value shown on every point when nothing hidden (query `[data-testid="line-value"]`); the point at `hideValueIndices` is omitted; `role="img"` + `aria-label` present.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LineChart } from './LineChart';

afterEach(cleanup);
const CATS = [ {label:'Mon',value:4},{label:'Tue',value:9},{label:'Wed',value:6} ];
const vals = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-testid="line-value"]')).map(n => n.textContent?.trim());

describe('LineChart value labels', () => {
  it('shows all values by default', () => {
    const { container } = render(<LineChart categories={CATS} />);
    expect(vals(container).sort()).toEqual(['4','6','9']);
  });
  it('hides the queried point value (read-line)', () => {
    const { container } = render(<LineChart categories={CATS} hideValueIndices={[1]} />);
    expect(vals(container)).not.toContain('9');
  });
  it('is labelled for a11y', () => {
    const { container } = render(<LineChart categories={CATS} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/line chart/i);
  });
});
```

- [ ] **Step 2:** PieChart test — assert every slice prints its value (needed for pie-fraction to be answerable), and `role="img"` + `aria-label`.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PieChart } from './PieChart';

afterEach(cleanup);
const CATS = [ {label:'A',value:3},{label:'B',value:4},{label:'C',value:2},{label:'D',value:1} ];

describe('PieChart', () => {
  it('prints each slice value (pie-fraction must be answerable)', () => {
    const { container } = render(<PieChart categories={CATS} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent?.trim());
    for (const v of ['3','4','2','1']) expect(texts).toContain(v);
  });
  it('is labelled for a11y', () => {
    const { container } = render(<PieChart categories={CATS} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/pie chart/i);
  });
});
```

- [ ] **Step 3:** Run `npx vitest run src/modules/charts/LineChart.test.tsx src/modules/charts/PieChart.test.tsx`. If PieChart lacks `role="img"`/`aria-label`, add them (mirror BarChart). Expected: PASS.
- [ ] **Step 4:** Commit `test(charts): visual answer-integrity for line + pie`.

### Task 10: shapes figure + time clock renderers
**Files:** identify the shapes visual component and the clock component (READ `ShapesPlay.tsx`/`TimePlay.tsx` imports). Create `*.test.tsx` beside each.

- [ ] **Step 1:** Shapes — render the figure for a skill whose answer is a dimension/area and assert the answer value is NOT printed on the figure unless the skill intends it (analogue of the charts give-away). If shapes never prints answer values, assert `role="img"` + `aria-label` only and note that in the test comment.
- [ ] **Step 2:** Time clock — render the clock for a `read-clock` question and assert the digital time string is not shown as text alongside (else the read is trivial); assert `role="img"`/`aria-label`.
- [ ] **Step 3:** Run the two files; fix any real give-away found in the component. Expected: PASS.
- [ ] **Step 4:** Commit `test(shapes,time): visual answer-integrity`.

---

## Tasks 11–13: Layer 3 e2e auto-player

### Task 11: OracleData rollout — group A (times-tables, arithmetic, number-sense, money, decimals, number-theory)
**Files per module:** Create `src/modules/<slug>/oracle.ts`; modify `<slug>/<Module>Play.tsx` to render `<E2EOracle data={<slug>Oracle(q, choices)} />` inside the question card, guarded by `E2E_ENABLED` (copy the exact pattern from `ChartsPlay.tsx` lines importing `E2EOracle`, `E2E_ENABLED`, and `chartOracle`, and the `{E2E_ENABLED && <E2EOracle .../>}` render).

- [ ] **Step 1:** For each module, write `oracle.ts` producing `OracleData` (`{ questionId: JSON.stringify(q), expected, inputMode, choices?, correctChoice?, highlightCount: 0 }`). `expected` = the adapter's `correctAnswer` logic; reuse it by importing from the testkit adapter is NOT allowed (adapters are test-only) — instead reuse the module's own canonical-answer helper (the same one the adapter wired). `inputMode` = `'choices'` when the Play shows buttons for this question else `'typed'`.
- [ ] **Step 2:** Wire `<E2EOracle>` into each Play component's question card.
- [ ] **Step 3:** Run `npx vitest run src/__tests__/play-skill-coverage.test.tsx` (still green — oracle is hidden) and `npx tsc -b --noEmit` (green).
- [ ] **Step 4:** Commit `feat(e2e): oracle rollout — group A modules`.

### Task 12: OracleData rollout — group B (conversions, word-problems, ratio-proportion, algebra, statistics, time, shapes)
- [ ] Same steps as Task 11 for these seven modules. Commit `feat(e2e): oracle rollout — group B modules`.

### Task 13: Generic auto-player spec
**Files:** Create `e2e/auto-player.spec.ts`; extend `e2e/support/play.ts` with a `startModule(page, slug, skill)` helper if the existing `startCharts`/etc. don't already generalise (READ `e2e/support/play.ts`).

- [ ] **Step 1:** Write the spec: for each module slug, start a single-skill game, then loop: read the oracle (`readOracle` from `e2e/support/oracle.ts`), submit the correct answer (click `Answer ${correctChoice}` when `inputMode==='choices'`, else type `expected` and submit), assert the score increments and `questionId` advances, until the results screen shows. Assert final score equals questions answered.

```ts
// e2e/auto-player.spec.ts (shape)
import { test, expect } from '@playwright/test';
import { startModule } from './support/play';
import { readOracle } from './support/oracle';

const MODULES: Array<{ slug: string; skill: string }> = [
  { slug: 'times-tables', skill: 'multiply' },
  // ...one representative skill per module...
];

for (const { slug, skill } of MODULES) {
  test(`auto-play ${slug}/${skill}: every correct answer scores`, async ({ page }) => {
    await startModule(page, slug, skill);
    for (let i = 0; i < 5; i++) {
      const o = await readOracle(page);
      if (o.inputMode === 'choices') {
        await page.getByRole('button', { name: `Answer ${o.correctChoice}` }).click();
      } else {
        await page.getByRole('textbox').first().fill(o.expected);
        await page.getByRole('button', { name: /check/i }).click();
      }
      await expect.poll(async () => (await readOracle(page).catch(() => null))?.questionId ?? 'done').not.toBe(o.questionId);
    }
  });
}
```

- [ ] **Step 2:** Run `npm run test:e2e -- auto-player` (starts wrangler + D1 via the configured `webServer`). Fix real gameplay bugs surfaced; adjust `startModule` per-module setup as needed.
- [ ] **Step 3:** Extend `e2e/bugs/charts-no-clue.spec.ts` to also assert (via oracle/DOM) that for a `read-bar` question the answer value is not printed on the queried bar.
- [ ] **Step 4:** Commit `feat(e2e): generic auto-player across every module`.

---

## Task 14: Wire typecheck into the gate + progress ledger

**Files:** Modify CI config if present (READ `.github/workflows/*` or equivalent); if none, add a `verify` npm script.

- [ ] **Step 1:** Add to `package.json` scripts: `"verify": "tsc -b --noEmit && vitest run"`.
- [ ] **Step 2:** If a CI workflow exists, add a `npm run verify` step before deploy.
- [ ] **Step 3:** Run `npm run verify`. Expected: green.
- [ ] **Step 4:** Commit `chore: verify script gates typecheck + unit suite`.

---

## Self-Review Notes

- **Spec coverage:** Layer 0 → Task 1; common contract → Task 2; Layer 1 harness + adapters → Tasks 3–8; Layer 2 → Tasks 9–10; Layer 3 oracle + player → Tasks 11–13; typecheck gate → Task 14. All spec sections mapped.
- **Known ambiguities flagged inline** (grader/choices export names marked `*`; each such adapter task includes a "read the file first" step). These are not placeholders — they are explicit verification steps because the harvest grep did not capture every grader name.
- **Type consistency:** `PlayableModule` surface (`slug`, `skills`, `settingsFor`, `generate`, `correctAnswer`, `isCorrect`, `choices`, `hiddenValueIndices?`) is used identically in Tasks 2, 3, and 4–8, and consumed by the harness in Task 3 and the oracle rollout in Tasks 11–12.
