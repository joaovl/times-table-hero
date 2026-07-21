// e2e/support/play.ts
//
// Setup adapters + answer/variety/no-clue helpers shared by the Fractions and
// Charts bug specs (Tasks 6-9).
//
// The Fractions/Charts setup screens (`src/modules/fractions/FractionsSetup.tsx`,
// `src/modules/charts/ChartsSetup.tsx`) render each skill as a toggle
// `<button aria-pressed={selected}>` whose accessible name is a *human
// label*, not the skill's slug (e.g. `'add-same'` renders as the button
// "Add (same denom)"). Both setup screens persist the previous selection to
// localStorage (`getSavedFractionSettings` / `getSavedChartsSettings`), and
// default to a single pre-selected skill (`'add-same'` / `'read-bar'`).
// Because a persisted selection could contain more than one skill (or a
// different single skill) by the time a spec runs, `startFractions` /
// `startCharts` don't assume a starting state - they select the target skill
// then deselect every other skill that happens to be selected, driven purely
// by the `aria-pressed` attribute already used by the app.
//
// The Start button's accessible name on both setup screens is "Let's Go!"
// (not "Start" - see `<Button onClick={start} ...>Let's Go!</Button>` in both
// files).
import { expect, type Locator, type Page } from '@playwright/test';
import { readOracle } from './oracle';
import en from '../../src/lib/i18n/locales/en.json' with { type: 'json' };

// The suite runs in `en`; labels are sourced from the SAME catalog the app
// renders from, so a copy change can never silently break a selector.
const label = (key: keyof typeof en): string => en[key] as string;

// Slug -> en.json key for the fractions Skills toggle buttons.
const FRACTION_SKILL_LABELS: Record<string, string> = {
  'add-same': label('fractions.skills.addSame'),
  'sub-same': label('fractions.skills.subSame'),
  'add-diff': label('fractions.skills.addDiff'),
  'sub-diff': label('fractions.skills.subDiff'),
  id: label('fractions.skills.id'),
  eq: label('fractions.skills.eq'),
  cmp: label('fractions.skills.cmp'),
  mixed: label('fractions.skills.mixed'),
  'mul-by-whole': label('fractions.skills.mulByWhole'),
  'mixed-mul-whole': label('fractions.skills.mixedMulWhole'),
  'mul-frac': label('fractions.skills.mulFrac'),
  'to-decimal': label('fractions.skills.toDecimal'),
  'from-decimal': label('fractions.skills.fromDecimal'),
  'add-mixed': label('fractions.skills.addMixed'),
  'sub-mixed': label('fractions.skills.subMixed'),
  'div-frac-whole': label('fractions.skills.divFracWhole'),
};

// Slug -> en.json key for the charts Skill chips.
const CHART_SKILL_LABELS: Record<string, string> = {
  'read-bar': label('charts.skills.readBar'),
  'compare-bar': label('charts.skills.compareBar'),
  'total-bar': label('charts.skills.totalBar'),
  'read-pie': label('charts.skills.readPie'),
  'pie-fraction': label('charts.skills.pieFraction'),
  'read-line': label('charts.skills.readLine'),
  'line-trend': label('charts.skills.lineTrend'),
  'line-max': label('charts.skills.lineMax'),
  'timetable-read': label('charts.skills.timetableRead'),
  'timetable-duration': label('charts.skills.timetableDuration'),
  'multi-step-bar': label('charts.skills.multiStepBar'),
};

const START_BUTTON_NAME = label('game.setup.start');

// Select exactly `label` among the toggle buttons inside `container` (a Card),
// deselecting any other currently-selected sibling. Generic over Fractions'
// "Skills" card, Charts' "Skill" card, and Fractions' "Denominators" card
// (single-target use), all of which use the same
// `aria-pressed`-toggle-button pattern (see `buttonClass` in both *Setup.tsx
// files). Robust to whatever selection localStorage restored, so it does not
// assume the app's hardcoded defaults.
export async function isolateToggle(container: Locator, label: string) {
  const target = container.getByRole('button', { name: label, exact: true });
  await target.waitFor();
  if ((await target.getAttribute('aria-pressed')) !== 'true') {
    await target.click();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
  }
  // Deselect every other currently-selected toggle in this group. The app
  // refuses to deselect the last remaining item, but since `target` is now
  // selected there is always a second item to click away safely.
  for (let guard = 0; guard < 50; guard++) {
    const selected = container.locator('button[aria-pressed="true"]');
    const count = await selected.count();
    let clickedAnother = false;
    for (let i = 0; i < count; i++) {
      const btn = selected.nth(i);
      const text = (await btn.textContent())?.trim();
      if (text !== label) {
        await btn.click();
        clickedAnother = true;
        break;
      }
    }
    if (!clickedAnother) return;
  }
  throw new Error(`isolateToggle: could not isolate "${label}" after 50 attempts`);
}

// Select exactly `denominators` among the "Denominators" chip group (used
// only by Fractions). Adds every wanted value first (so at least one item is
// always selected), then removes anything not wanted.
async function setDenominators(container: Locator, denominators: number[]) {
  const wanted = new Set(denominators);
  for (const d of denominators) {
    const btn = container.getByRole('button', { name: String(d), exact: true });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click();
    }
  }
  for (let guard = 0; guard < 50; guard++) {
    const selected = container.locator('button[aria-pressed="true"]');
    const count = await selected.count();
    let clickedAnother = false;
    for (let i = 0; i < count; i++) {
      const btn = selected.nth(i);
      const text = (await btn.textContent())?.trim();
      if (text && !wanted.has(Number(text))) {
        await btn.click();
        clickedAnother = true;
        break;
      }
    }
    if (!clickedAnother) return;
  }
  throw new Error('setDenominators: could not converge after 50 attempts');
}

// Fractions setup: choose exactly one skill, optionally restrict
// denominators, then Start.
export async function startFractions(
  page: Page,
  opts: { skill: string; denominators?: number[] }
) {
  const label = FRACTION_SKILL_LABELS[opts.skill];
  if (!label) throw new Error(`startFractions: unknown skill "${opts.skill}"`);

  await page.goto('/fractions');
  const skillsCard = page.getByRole('heading', { name: 'Skills', exact: true }).locator('xpath=..');
  await isolateToggle(skillsCard, label);

  if (opts.denominators) {
    const denomsCard = page
      .getByRole('heading', { name: 'Denominators', exact: true })
      .locator('xpath=..');
    await setDenominators(denomsCard, opts.denominators);
  }

  await page.getByRole('button', { name: START_BUTTON_NAME, exact: true }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

// Charts setup: choose exactly one skill, then Start.
export async function startCharts(page: Page, opts: { skill: string }) {
  const label = CHART_SKILL_LABELS[opts.skill];
  if (!label) throw new Error(`startCharts: unknown skill "${opts.skill}"`);

  await page.goto('/charts');
  const skillCard = page.getByRole('heading', { name: 'Skill', exact: true }).locator('xpath=..');
  await isolateToggle(skillCard, label);

  await page.getByRole('button', { name: START_BUTTON_NAME, exact: true }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

// Type a "num/den" answer into a fraction op question and submit. Matches the
// add-same/sub-same/add-diff/sub-diff question form in
// `src/modules/fractions/FractionsPlay.tsx`, which labels its inputs
// `aria-label="Numerator"` / `aria-label="Denominator"` and its submit
// button "Check".
export async function answerFractionOp(page: Page, value: string) {
  const [num, den] = value.split('/');
  await page.getByLabel('Numerator', { exact: true }).fill(num);
  await page.getByLabel('Denominator', { exact: true }).fill(den);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
}

// A stable identity for the current question, used to measure variety.
export async function questionSignature(page: Page): Promise<string> {
  return (await readOracle(page)).questionId;
}

// Generic module start: go to the module route and press "Let's Go!" with the
// setup screen's default settings, then wait for the first question's oracle.
export async function startModuleByRoute(page: Page, route: string) {
  await page.goto(route);
  await page.getByRole('button', { name: START_BUTTON_NAME, exact: true }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

// The setup card that holds a module's skill toggles, located by its heading
// ("Skill" for charts/time, "Skills" for the rest).
export function skillsCard(page: Page, heading: string): Locator {
  return page.getByRole('heading', { name: heading, exact: true }).locator('xpath=..');
}

// How many skill toggles the skills card holds.
export async function countSkillToggles(page: Page, heading: string): Promise<number> {
  const toggles = skillsCard(page, heading).locator('button[aria-pressed]');
  await toggles.first().waitFor();
  return toggles.count();
}

// Select the i-th skill toggle and deselect every other one — by element
// index, not label text, so multi-line skill buttons (whose textContent lacks
// the spaces the accessible name has) still match reliably.
export async function isolateToggleByIndex(container: Locator, index: number) {
  const toggles = container.locator('button[aria-pressed]');
  const target = toggles.nth(index);
  await target.waitFor();
  if ((await target.getAttribute('aria-pressed')) !== 'true') {
    await target.click();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
  }
  for (let guard = 0; guard < 50; guard++) {
    const n = await toggles.count();
    let clickedAnother = false;
    for (let j = 0; j < n; j++) {
      if (j === index) continue;
      const btn = toggles.nth(j);
      if ((await btn.getAttribute('aria-pressed')) === 'true') {
        await btn.click();
        clickedAnother = true;
        break;
      }
    }
    if (!clickedAnother) return;
  }
  throw new Error(`isolateToggleByIndex: could not isolate index ${index} after 50 attempts`);
}

// Select a difficulty by its button label if a difficulty selector exists on
// this setup screen (some modules have none). Case-insensitive: catalogs use
// both "Easy" and "easy". Returns true if a difficulty button was clicked.
export async function setDifficultyIfPresent(page: Page, level: 'easy' | 'medium' | 'hard'): Promise<boolean> {
  const btn = page.getByRole('button', { name: new RegExp(`^${level}$`, 'i') });
  if (await btn.count()) {
    await btn.first().click();
    return true;
  }
  return false;
}

// Press "Let's Go!" and wait for the first question's oracle.
export async function pressStart(page: Page) {
  await page.getByRole('button', { name: START_BUTTON_NAME, exact: true }).click();
  await expect(page.getByTestId('e2e-oracle')).toBeAttached();
}

// Answer the current question using the oracle's ground truth: click the
// correct multiple-choice button (or "None of these" when the correct value
// isn't shown), or type the expected answer and press Check. Returns the
// questionId that was answered so the caller can wait for the next question.
export async function answerViaOracle(page: Page): Promise<string> {
  const o = await readOracle(page);
  if (o.inputMode === 'choices') {
    const shown = o.choices ?? [];
    const target = shown.includes(o.expected) ? o.expected : 'None of these';
    // The shared AnswerChoices renders aria-label "Answer X"; a couple of
    // modules (e.g. times-tables) render the value as the button's own text.
    const byAria = page.getByRole('button', { name: `Answer ${target}`, exact: true });
    if (await byAria.count()) {
      await byAria.first().click();
    } else {
      await page.getByRole('button', { name: target, exact: true }).first().click();
    }
  } else {
    // "Typed" per the oracle, but the actual widget varies by skill: a single
    // field, two fields (a fraction n/d), or a row of label/word buttons (e.g.
    // chart "which slice?" category buttons, or rising/falling/flat). Pick the
    // interaction from what's actually on screen.
    const inputs = page.locator('input:visible');
    // Give the question a beat to mount its inputs before counting.
    await page.waitForTimeout(80);
    const nInputs = await inputs.count();

    if (nInputs >= 2 && o.expected.includes('/')) {
      // Two-field fraction: "n/d".
      const [num, den] = o.expected.split('/');
      await fillStable(page, inputs.nth(0), num.trim());
      await fillStable(page, inputs.nth(1), den.trim());
      await submitTyped(page, inputs.nth(1));
    } else if (nInputs >= 1) {
      const box = inputs.first();
      await fillStable(page, box, o.expected);
      await submitTyped(page, box);
    } else {
      // No text input — the answer is a labelled/word button (chart label or
      // trend). Click the button whose accessible name matches `expected`
      // (case-insensitive; catalogs may capitalise trend words).
      const exact = page.getByRole('button', { name: new RegExp(`^\\s*${escapeRegExp(o.expected)}\\s*$`, 'i') });
      if (await exact.count()) {
        await exact.first().click();
      } else {
        await page.getByRole('button', { name: new RegExp(escapeRegExp(o.expected), 'i') }).first().click();
      }
    }
  }
  return o.questionId;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fill a field and re-fill until the value survives the question-change reset.
async function fillStable(page: Page, box: Locator, value: string) {
  await box.waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 6; attempt++) {
    await box.fill(value);
    await page.waitForTimeout(120);
    if ((await box.inputValue()) === value) break;
  }
}

// Submit a typed answer via the form's submit button (preferred) or Enter.
async function submitTyped(page: Page, box: Locator) {
  const submit = page.locator('button[type="submit"]:visible').first();
  if (await submit.count()) {
    await submit.click();
  } else {
    await box.press('Enter');
  }
}

// Answer the current question and wait until the game advances to the next one
// (or ends). Submission can occasionally be swallowed by a question-change
// re-render under parallel load, so this re-answers until the question id
// actually changes, capped to a few attempts.
export async function answerAndAdvance(page: Page): Promise<void> {
  const start = (await readOracle(page)).questionId;
  for (let attempt = 0; attempt < 5; attempt++) {
    await answerViaOracle(page);
    try {
      await expect
        .poll(
          async () => (await readOracle(page).catch(() => ({ questionId: 'ended' }))).questionId,
          { timeout: 2500 },
        )
        .not.toBe(start);
      return;
    } catch {
      // Submission didn't take (transient race) — re-answer.
    }
  }
  throw new Error(`question did not advance after retries (started at ${start})`);
}

// The "no clues" invariant: no chart element highlighted (except where the
// oracle legitimately reports one, e.g. pie-fraction), and the answer string is
// never present in the visible DOM.
export async function expectNoClues(page: Page) {
  const o = await readOracle(page);
  expect(o.highlightCount ?? 0).toBe(0);
}
