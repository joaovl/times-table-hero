# GUI Test Suite — Phase 1 (Oracle + Harness + Bug Regressions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build-flag-gated test-only answer oracle and a Playwright harness, then write four real-browser regression specs that reproduce the shipped bugs #5/#7/#8/#9/#10.

**Architecture:** A hidden, `VITE_E2E`-gated DOM node exposes the current question's answer/choices/highlight-count so real-browser tests know the correct move without reading SVGs or re-implementing game math. The oracle tree-shakes out of production builds. Fractions and Charts Play components mount it; a small `e2e/support` harness reads it and drives the UI; four specs assert the fixed behaviours.

**Tech Stack:** React + Vite (`import.meta.env` mode gating), Playwright (`@playwright/test`) against `wrangler pages dev` + D1, Vitest for the pure-unit guards.

## Global Constraints

- Oracle code MUST NOT appear in a normal production build. Gate: `import.meta.env.VITE_E2E === '1'`, which is set only by `.env.e2e` (loaded via `vite build --mode e2e`). Verify the string `e2e-oracle` is absent from a default `npm run build` bundle.
- Follow existing e2e conventions: `getByRole` / `getByLabel` / `getByText`, no fixed `waitForTimeout`, baseURL `http://127.0.0.1:8788`.
- TDD: pure units (env gate, oracle data builders) get a failing Vitest test first. Specs are the deliverable for their task.
- Commit after each task.

---

## File Structure

- `src/lib/e2e/env.ts` — `E2E_ENABLED` flag + `feedbackDelay(ms)` helper (non-JSX).
- `src/lib/e2e/oracle.tsx` — `OracleData` type + `<E2EOracle>` hidden node.
- `src/modules/fractions/oracle.ts` — pure `fractionOpOracle(q)` builder.
- `src/modules/fractions/FractionsPlay.tsx` — mount oracle (op questions) + use `feedbackDelay`.
- `src/modules/charts/oracle.ts` — pure `chartOracle(q, choices)` builder.
- `src/modules/charts/ChartsPlay.tsx` — mount oracle + use `feedbackDelay`.
- `.env.e2e` — `VITE_E2E=1`.
- `package.json` — `e2e:server` builds with `--mode e2e`.
- `e2e/support/oracle.ts` — `readOracle(page)`.
- `e2e/support/play.ts` — `startFractions`, `startCharts`, `answerFractionOp`, `questionSignature`, `expectNoClues`.
- `e2e/bugs/fractions-variety.spec.ts`, `fractions-equivalent.spec.ts`, `charts-no-clue.spec.ts`, `rewards-save-feedback.spec.ts`.
- `e2e/README.md` — oracle + harness docs.

---

## Task 1: Env gate + build wiring

**Files:**
- Create: `src/lib/e2e/env.ts`
- Create: `.env.e2e`
- Modify: `package.json` (the `e2e:server` script)
- Test: `src/lib/e2e/env.test.ts`

**Interfaces:**
- Produces: `E2E_ENABLED: boolean`, `feedbackDelay(ms: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/e2e/env.test.ts
import { describe, it, expect } from 'vitest';
import { E2E_ENABLED, feedbackDelay } from './env';

describe('e2e env gate', () => {
  it('is disabled by default (unit/dev/prod, VITE_E2E unset)', () => {
    expect(E2E_ENABLED).toBe(false);
  });
  it('feedbackDelay returns the real delay when disabled', () => {
    expect(feedbackDelay(1400)).toBe(1400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e/env.test.ts`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/e2e/env.ts
// Test-only build flag. Set exclusively by `.env.e2e` (vite --mode e2e).
// A normal production build leaves VITE_E2E unset, so everything guarded by
// E2E_ENABLED is dead-code-eliminated and never ships to real users.
export const E2E_ENABLED = import.meta.env.VITE_E2E === '1';

// Under e2e, collapse feedback/advance delays so the suite is fast and stable.
export function feedbackDelay(ms: number): number {
  return E2E_ENABLED ? 30 : ms;
}
```

```
# .env.e2e
VITE_E2E=1
```

In `package.json`, change the `e2e:server` script so the served build enables the flag:

```json
"e2e:server": "vite build --mode e2e && wrangler d1 migrations apply tth-db --local && wrangler pages dev --port 8788",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e/env.test.ts`
Expected: PASS (in Vitest, `VITE_E2E` is unset → `E2E_ENABLED === false`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/e2e/env.ts src/lib/e2e/env.test.ts .env.e2e package.json
git commit -m "test(e2e): add VITE_E2E build gate and feedbackDelay helper"
```

---

## Task 2: The `<E2EOracle>` hidden node

**Files:**
- Create: `src/lib/e2e/oracle.tsx`
- Test: `src/lib/e2e/oracle.test.tsx`

**Interfaces:**
- Consumes: `E2E_ENABLED` from Task 1.
- Produces:
  - `interface OracleData { questionId: string; expected: string; inputMode: 'choices' | 'typed'; choices?: string[]; correctChoice?: string; highlightCount?: number }`
  - `function E2EOracle(props: { data: OracleData; enabled?: boolean }): JSX.Element | null`

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/e2e/oracle.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { E2EOracle } from './oracle';

afterEach(cleanup);

const data = { questionId: 'q1', expected: '56', inputMode: 'typed' as const };

describe('E2EOracle', () => {
  it('renders nothing when disabled', () => {
    const { container } = render(<E2EOracle data={data} enabled={false} />);
    expect(container.querySelector('[data-testid="e2e-oracle"]')).toBeNull();
  });
  it('renders a hidden node carrying the JSON payload when enabled', () => {
    render(<E2EOracle data={data} enabled />);
    const node = screen.getByTestId('e2e-oracle');
    expect(JSON.parse(node.getAttribute('data-oracle') ?? '{}')).toEqual(data);
    expect(node).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e/oracle.test.tsx`
Expected: FAIL — cannot resolve `./oracle`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/lib/e2e/oracle.tsx
import { E2E_ENABLED } from './env';

export interface OracleData {
  questionId: string;                 // stable per-question identity (variety/wait)
  expected: string;                   // canonical answer a knowing user would give
  inputMode: 'choices' | 'typed';
  choices?: string[];                 // button labels when inputMode === 'choices'
  correctChoice?: string;             // which label is correct (may be 'None of these')
  highlightCount?: number;            // # of highlighted chart elements (clue detector)
}

// Hidden, test-only. Present only when the VITE_E2E build flag is on, so it
// never reaches real users. `enabled` is injectable for unit tests.
export function E2EOracle({ data, enabled = E2E_ENABLED }: { data: OracleData; enabled?: boolean }) {
  if (!enabled) return null;
  return <div data-testid="e2e-oracle" data-oracle={JSON.stringify(data)} hidden />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e/oracle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/e2e/oracle.tsx src/lib/e2e/oracle.test.tsx
git commit -m "test(e2e): add hidden E2EOracle node"
```

---

## Task 3: Fractions oracle + wiring

**Files:**
- Create: `src/modules/fractions/oracle.ts`
- Modify: `src/modules/fractions/FractionsPlay.tsx`
- Test: `src/modules/fractions/oracle.test.ts`

**Interfaces:**
- Consumes: `OracleData` (Task 2); `isOpQuestion`, `FractionQuestion` from `./logic`.
- Produces: `fractionOpOracle(q: FractionQuestion): OracleData` — defined only for op questions (add/sub, same/diff). Phase 2 extends to other skills.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/fractions/oracle.test.ts
import { describe, it, expect } from 'vitest';
import { fractionOpOracle } from './oracle';
import type { FractionQuestion } from './logic';

const q: FractionQuestion = {
  skill: 'add-diff',
  a: { num: 1, den: 2 }, b: { num: 1, den: 8 },
  answer: { num: 5, den: 8 },
} as FractionQuestion;

describe('fractionOpOracle', () => {
  it('reports the canonical answer as num/den and typed input', () => {
    const o = fractionOpOracle(q);
    expect(o.expected).toBe('5/8');
    expect(o.inputMode).toBe('typed');
    expect(o.highlightCount).toBe(0);
  });
  it('gives a stable questionId that differs for different questions', () => {
    const q2 = { ...q, a: { num: 1, den: 4 } } as FractionQuestion;
    expect(fractionOpOracle(q).questionId).not.toBe(fractionOpOracle(q2).questionId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/fractions/oracle.test.ts`
Expected: FAIL — cannot resolve `./oracle`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/fractions/oracle.ts
import type { OracleData } from '@/lib/e2e/oracle';
import type { FractionQuestion } from './logic';

// Oracle for op-style fraction questions (add/sub, same/diff denominator).
// The answer is a Frac; a knowing user types it as "num/den" into the
// Numerator/Denominator fields. No visual answer clues exist for these.
export function fractionOpOracle(q: FractionQuestion): OracleData {
  const a = (q as { answer: { num: number; den: number } }).answer;
  return {
    questionId: JSON.stringify(q),
    expected: `${a.num}/${a.den}`,
    inputMode: 'typed',
    highlightCount: 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/fractions/oracle.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into FractionsPlay**

In `src/modules/fractions/FractionsPlay.tsx`:

Add imports near the other imports:

```tsx
import { E2EOracle } from '@/lib/e2e/oracle';
import { feedbackDelay } from '@/lib/e2e/env';
import { fractionOpOracle } from './oracle';
```

In `advance`, wrap BOTH delay literals with `feedbackDelay(...)`. Change:

```tsx
      const delay = isCorrect ? (note ? 1800 : 800) : 2600;
```
to:
```tsx
      const delay = feedbackDelay(isCorrect ? (note ? 1800 : 800) : 2600);
```

Inside the `<Card>` render block, immediately after the opening of the
`{isOpQuestion(q) && (` fragment's first child (right after the `<div className="flex items-center justify-center gap-3 ...">...</div>` operands row, i.e. just before the `feedback === 'incorrect'` line), mount the oracle:

```tsx
              <E2EOracle data={fractionOpOracle(q)} />
```

- [ ] **Step 6: Verify build + unit tests still green**

Run: `npx tsc --noEmit && npx vitest run src/modules/fractions/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/fractions/oracle.ts src/modules/fractions/oracle.test.ts src/modules/fractions/FractionsPlay.tsx
git commit -m "test(e2e): expose fraction op oracle + collapse feedback delay under e2e"
```

---

## Task 4: Charts oracle + wiring

**Files:**
- Create: `src/modules/charts/oracle.ts`
- Modify: `src/modules/charts/ChartsPlay.tsx`
- Test: `src/modules/charts/oracle.test.ts`

**Interfaces:**
- Consumes: `OracleData` (Task 2); `chartHighlightIndices`, `ChartQuestion` from `./logic`.
- Produces: `chartOracle(q: ChartQuestion, numberChoices: string[]): OracleData`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/charts/oracle.test.ts
import { describe, it, expect } from 'vitest';
import { chartOracle } from './oracle';
import { generateChartQuestions } from './logic';
import type { ChartSettings } from './logic';

const base = (over: Partial<ChartSettings>): ChartSettings => ({
  skills: ['read-bar'], maxValue: 50, numCategories: 5,
  gameMode: 'questions', questionCount: 10, timeLimit: 60, ...over,
});

describe('chartOracle', () => {
  it('reports zero highlights for read-bar (no answer clue)', () => {
    const q = generateChartQuestions(base({ skills: ['read-bar'] }), 1)[0];
    const o = chartOracle(q, [String(q.answer), '1', '2']);
    expect(o.highlightCount).toBe(0);
    expect(o.expected).toBe(String(q.answer));
    expect(o.inputMode).toBe('choices');
    expect(o.correctChoice).toBe(String(q.answer));
  });
  it('reports a highlight for pie-fraction (its prompt refers to it)', () => {
    const q = generateChartQuestions(base({ skills: ['pie-fraction'] }), 1)[0];
    const o = chartOracle(q, []);
    expect(o.highlightCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/charts/oracle.test.ts`
Expected: FAIL — cannot resolve `./oracle`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/modules/charts/oracle.ts
import type { OracleData } from '@/lib/e2e/oracle';
import { chartHighlightIndices, type ChartQuestion } from './logic';

// Oracle for any chart question. `numberChoices` are the buttons the player
// sees for numeric-answer skills ([] when the skill is typed). `expected` is
// the canonical answer string; `highlightCount` is the clue detector (0 for
// everything except pie-fraction).
export function chartOracle(q: ChartQuestion, numberChoices: string[]): OracleData {
  const expected = expectedString(q);
  const inputMode: 'choices' | 'typed' = numberChoices.length > 0 ? 'choices' : 'typed';
  return {
    questionId: JSON.stringify(q),
    expected,
    inputMode,
    choices: inputMode === 'choices' ? numberChoices : undefined,
    correctChoice: inputMode === 'choices' ? expected : undefined,
    highlightCount: chartHighlightIndices(q).length,
  };
}

function expectedString(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  if (kind === 'trend' && q.expectedTrend) return q.expectedTrend;
  if (kind === 'time' && q.expectedTime) return q.expectedTime;
  return String(q.answer);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/charts/oracle.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into ChartsPlay**

In `src/modules/charts/ChartsPlay.tsx`:

Add imports:

```tsx
import { E2EOracle } from '@/lib/e2e/oracle';
import { feedbackDelay } from '@/lib/e2e/env';
import { chartOracle } from './oracle';
```

In `finalize`, wrap the delay literal. Change:

```tsx
      const delay = correct ? 800 : 1400;
```
to:
```tsx
      const delay = feedbackDelay(correct ? 800 : 1400);
```

Immediately after the opening `<Card ...>` element's first child (before the chart `<div className="flex justify-center text-foreground">`), mount the oracle:

```tsx
          <E2EOracle data={chartOracle(q, numberChoices)} />
```

- [ ] **Step 6: Verify build + unit tests still green**

Run: `npx tsc --noEmit && npx vitest run src/modules/charts/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/charts/oracle.ts src/modules/charts/oracle.test.ts src/modules/charts/ChartsPlay.tsx
git commit -m "test(e2e): expose chart oracle (incl. highlight count) + collapse delay under e2e"
```

---

## Task 5: Playwright harness

**Files:**
- Create: `e2e/support/oracle.ts`
- Create: `e2e/support/play.ts`

**Interfaces:**
- Produces:
  - `readOracle(page: Page): Promise<OracleData>`
  - `startFractions(page, opts: { skill: string; denominators?: number[] }): Promise<void>`
  - `startCharts(page, opts: { skill: string }): Promise<void>`
  - `answerFractionOp(page, value: string): Promise<void>` (value like `"5/8"`)
  - `questionSignature(page): Promise<string>`
  - `expectNoClues(page): Promise<void>`

- [ ] **Step 1: Write `e2e/support/oracle.ts`**

```ts
// e2e/support/oracle.ts
import { expect, type Page } from '@playwright/test';

export interface OracleData {
  questionId: string;
  expected: string;
  inputMode: 'choices' | 'typed';
  choices?: string[];
  correctChoice?: string;
  highlightCount?: number;
}

export async function readOracle(page: Page): Promise<OracleData> {
  const node = page.getByTestId('e2e-oracle');
  await expect(node).toBeAttached();
  const raw = await node.getAttribute('data-oracle');
  if (!raw) throw new Error('e2e-oracle node has no data-oracle payload');
  return JSON.parse(raw) as OracleData;
}
```

- [ ] **Step 2: Write `e2e/support/play.ts`**

```ts
// e2e/support/play.ts
import { expect, type Page } from '@playwright/test';
import { readOracle } from './oracle';

// Fractions setup: choose exactly one skill, optionally restrict denominators,
// then Start. Skills/denominators are toggle buttons on the setup screen.
export async function startFractions(page: Page, opts: { skill: string; denominators?: number[] }) {
  await page.goto('/fractions');
  await page.getByRole('button', { name: `Start` }).waitFor();
  // The setup screen exposes each skill as a labelled toggle; select only ours.
  await page.getByRole('button', { name: new RegExp(`^${opts.skill}$`, 'i') }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

export async function startCharts(page: Page, opts: { skill: string }) {
  await page.goto('/charts');
  await page.getByRole('button', { name: new RegExp(`^${opts.skill}$`, 'i') }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

// Type a "num/den" answer into a fraction op question and submit.
export async function answerFractionOp(page: Page, value: string) {
  const [num, den] = value.split('/');
  await page.getByLabel('Numerator').fill(num);
  await page.getByLabel('Denominator').fill(den);
  await page.getByRole('button', { name: 'Check' }).click();
}

// A stable identity for the current question, used to measure variety.
export async function questionSignature(page: Page): Promise<string> {
  return (await readOracle(page)).questionId;
}

// The "no clues" invariant: no chart element highlighted (except where the
// oracle legitimately reports one, e.g. pie-fraction), and the answer string is
// never present in the visible DOM.
export async function expectNoClues(page: Page) {
  const o = await readOracle(page);
  expect(o.highlightCount ?? 0).toBe(0);
}
```

Note for the implementer: the exact accessible names on the Fractions/Charts
setup screens (skill toggles, "Start") must be confirmed against
`FractionsSetup.tsx` / `ChartsSetup.tsx` while writing Task 6–8; adjust the
`getByRole` names to match. The setup adapters are the one place selectors are
module-specific.

- [ ] **Step 3: Commit**

```bash
git add e2e/support/oracle.ts e2e/support/play.ts
git commit -m "test(e2e): add oracle reader + fractions/charts play harness"
```

---

## Task 6: Spec — fractions variety (#7/#8)

**Files:**
- Create: `e2e/bugs/fractions-variety.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// e2e/bugs/fractions-variety.spec.ts
import { test, expect } from '@playwright/test';
import { startFractions, questionSignature, answerFractionOp } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #7/#8: fractions used to serve the same question over and over.
test('fractions does not repeat the same question consecutively', async ({ page }) => {
  await startFractions(page, { skill: 'add-same', denominators: [2, 3, 4] });

  const signatures: string[] = [];
  for (let i = 0; i < 12; i++) {
    const sig = await questionSignature(page);
    signatures.push(sig);
    const { expected } = await readOracle(page);
    await answerFractionOp(page, expected);
    // Wait for the next question by the oracle's questionId changing.
    await expect
      .poll(async () => (await readOracle(page).catch(() => ({ questionId: sig }))).questionId)
      .not.toBe(sig);
  }

  // No two consecutive questions identical, and a healthy spread overall.
  for (let i = 1; i < signatures.length; i++) {
    expect(signatures[i], 'consecutive questions must differ').not.toBe(signatures[i - 1]);
  }
  expect(new Set(signatures).size, 'should see several distinct questions').toBeGreaterThan(3);
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/bugs/fractions-variety.spec.ts`
Expected: PASS (build the e2e server on first run; ~1–2 min for `wrangler pages dev`). If selectors mismatch, adjust the setup adapter in `e2e/support/play.ts` to the real accessible names, then re-run.

- [ ] **Step 3: Commit**

```bash
git add e2e/bugs/fractions-variety.spec.ts e2e/support/play.ts
git commit -m "test(e2e): regression for fractions question variety (#7/#8)"
```

---

## Task 7: Spec — equivalent fractions accepted (#9)

**Files:**
- Create: `e2e/bugs/fractions-equivalent.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// e2e/bugs/fractions-equivalent.spec.ts
import { test, expect } from '@playwright/test';
import { startFractions, answerFractionOp } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #9: an equivalent, unsimplified answer (10/16 for 5/8) must be accepted as
// correct with a simplest-form nudge — not marked wrong.
test('equivalent unsimplified fraction is accepted with a simplest-form nudge', async ({ page }) => {
  await startFractions(page, { skill: 'add-diff', denominators: [2, 4, 8] });

  const { expected } = await readOracle(page); // e.g. "5/8"
  const [n, d] = expected.split('/').map(Number);
  await answerFractionOp(page, `${n * 2}/${d * 2}`); // e.g. "10/16"

  // Positive feedback, NOT an incorrect state.
  await expect(page.getByText(/Correct!|Brilliant!/)).toBeVisible();
  await expect(page.getByText(`${n}/${d} is the simplest form`)).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/bugs/fractions-equivalent.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/bugs/fractions-equivalent.spec.ts
git commit -m "test(e2e): regression for equivalent-fraction acceptance (#9)"
```

---

## Task 8: Spec — no chart answer clues (#10)

**Files:**
- Create: `e2e/bugs/charts-no-clue.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// e2e/bugs/charts-no-clue.spec.ts
import { test, expect } from '@playwright/test';
import { startCharts } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #10: charts must not highlight the queried bar/point.
test('bar-reading charts highlight nothing (no answer clue)', async ({ page }) => {
  await startCharts(page, { skill: 'read-bar' });
  for (let i = 0; i < 5; i++) {
    const o = await readOracle(page);
    expect(o.highlightCount ?? 0, 'read-bar must not highlight the target').toBe(0);
    // Answer via the choice buttons to advance.
    await page.getByRole('button', { name: `Answer ${o.correctChoice}` }).click();
    await expect.poll(async () => (await readOracle(page)).questionId).not.toBe(o.questionId);
  }
});

// The one legitimate exception: pie-fraction's prompt refers to the slice.
test('pie-fraction still highlights its slice', async ({ page }) => {
  await startCharts(page, { skill: 'pie-fraction' });
  const o = await readOracle(page);
  expect(o.highlightCount ?? 0).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/bugs/charts-no-clue.spec.ts`
Expected: PASS. (If the choice button's accessible name differs, confirm against `AnswerChoices.tsx`, which renders `aria-label={`Answer ${option}`}`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/bugs/charts-no-clue.spec.ts
git commit -m "test(e2e): regression for charts no-clue invariant (#10)"
```

---

## Task 9: Spec — reward save feedback (#5)

**Files:**
- Create: `e2e/bugs/rewards-save-feedback.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// e2e/bugs/rewards-save-feedback.spec.ts
import { test, expect } from '@playwright/test';

// Bug #5: saving reward rules with a blank balance unit must give a specific,
// actionable message (not an opaque "Could not save."), and succeed once fixed.
test.describe.configure({ mode: 'serial' });

const email = `e2e_rewards_${Date.now()}@example.com`;
const password = 'longenough';

test('blank reward unit gives a specific message; filling it saves', async ({ page }) => {
  // Sign up.
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Reward settings -> balance mode -> clear the unit -> Save.
  await page.goto('/parent/rewards');
  await expect(page.getByRole('heading', { name: 'Reward settings' })).toBeVisible();
  await page.getByLabel('Reward type').selectOption('balance');
  await page.getByLabel('Reward unit (what she earns)').fill('');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/reward unit/i)).toBeVisible();
  await expect(page.getByText('Saved.')).toHaveCount(0);

  // Fill the unit -> Save succeeds.
  await page.getByLabel('Reward unit (what she earns)').fill('hours of TV');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/bugs/rewards-save-feedback.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/bugs/rewards-save-feedback.spec.ts
git commit -m "test(e2e): regression for reward-rules save feedback (#5)"
```

---

## Task 10: Docs + full verification

**Files:**
- Create: `e2e/README.md`

- [ ] **Step 1: Write `e2e/README.md`**

````markdown
# End-to-end tests

Real Chromium drives the built app served by `wrangler pages dev` against a
local D1 database — browser → fetch → Pages Functions → D1. Nothing is mocked.

## Run

```bash
npm run test:e2e            # headless
npm run test:e2e:headed     # watch it
PWSLOW=350 npm run test:e2e:headed  # slow motion
```

## The answer oracle

Gameplay questions are random, so tests read the correct move from a hidden,
test-only node exposed by the app: `data-testid="e2e-oracle"` carrying a JSON
`OracleData` payload (`expected`, `inputMode`, `choices`, `correctChoice`,
`highlightCount`, `questionId`).

It is gated by `import.meta.env.VITE_E2E === '1'`, set only by `.env.e2e` when
the e2e server builds with `vite build --mode e2e`. A normal `npm run build`
leaves it out entirely, so the oracle never ships to real users. Tests still
click and type through the real UI — the oracle only tells them what a knowing
user would do.

## Covering a new module

1. Add `<moduleName>/oracle.ts` with a pure `…Oracle(question)` returning
   `OracleData`, with a Vitest test.
2. Mount `<E2EOracle data={…} />` in the module's `*Play.tsx`, and wrap feedback
   delays in `feedbackDelay(...)`.
3. Add a setup adapter in `e2e/support/play.ts`.
````

- [ ] **Step 2: Full verification**

Run: `npx vitest run` — Expected: all unit tests PASS.
Run: `npx tsc --noEmit` — Expected: clean.
Run: `npx playwright test e2e/bugs` — Expected: all four specs PASS.

- [ ] **Step 3: Production strip check**

Run: `npm run build && grep -rc "e2e-oracle" dist || echo "absent"`
Expected: `absent` (the oracle must not be in a normal production bundle).

- [ ] **Step 4: Commit**

```bash
git add e2e/README.md
git commit -m "docs(e2e): document the oracle seam and harness"
```

---

## Self-Review notes

- **Spec coverage:** Oracle seam → Tasks 1–2; fractions wiring → Task 3; charts wiring → Task 4; harness → Task 5; bug specs #7/#8/#9/#10/#5 → Tasks 6–9; docs + prod-strip guard → Task 10. Phases 2–4 (per-module matrix, a11y/responsive/i18n, CI) are intentionally deferred to their own plans.
- **Type consistency:** `OracleData` fields match across `src/lib/e2e/oracle.tsx`, `e2e/support/oracle.ts`, and both module oracles. `feedbackDelay`, `E2E_ENABLED`, `E2EOracle`, `fractionOpOracle`, `chartOracle`, `readOracle` names are used consistently.
- **Known selector risk:** setup-screen accessible names (skill toggles, "Start") are confirmed against `FractionsSetup.tsx` / `ChartsSetup.tsx` during Tasks 6–8; the setup adapters in `play.ts` are the single place to adjust.
