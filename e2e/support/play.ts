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

// Slug -> human label, copied from `SKILL_LABELS` in
// `src/modules/fractions/logic.ts` (the button text, and therefore the
// accessible name, IS this label - the buttons render
// `<span>{SKILL_LABELS[s]}</span>` with no separate aria-label).
const FRACTION_SKILL_LABELS: Record<string, string> = {
  'add-same': 'Add (same denom)',
  'sub-same': 'Subtract (same denom)',
  'add-diff': 'Add (different denom)',
  'sub-diff': 'Subtract (different denom)',
  id: 'Identify shaded',
  eq: 'Equivalent fractions',
  cmp: 'Compare fractions',
  mixed: 'Mixed ↔ improper',
  'mul-by-whole': 'Multiply by whole',
  'mixed-mul-whole': 'Mixed × whole',
  'mul-frac': 'Fraction × fraction',
  'to-decimal': 'Fraction → decimal',
  'from-decimal': 'Decimal → fraction',
  'add-mixed': 'Add mixed numbers',
  'sub-mixed': 'Subtract mixed numbers',
  'div-frac-whole': 'Fraction ÷ whole',
};

// Slug -> human label, copied from `CHART_SKILL_LABEL` in
// `src/modules/charts/logic.ts`. Most slugs render verbatim; only the
// timetable/multi-step skills have a shortened label.
const CHART_SKILL_LABELS: Record<string, string> = {
  'read-bar': 'read-bar',
  'compare-bar': 'compare-bar',
  'total-bar': 'total-bar',
  'read-pie': 'read-pie',
  'pie-fraction': 'pie-fraction',
  'read-line': 'read-line',
  'line-trend': 'line-trend',
  'line-max': 'line-max',
  'timetable-read': 'timetable',
  'timetable-duration': 'duration',
  'multi-step-bar': 'multi-step',
};

const START_BUTTON_NAME = "Let's Go!";

// Select exactly `label` among the toggle buttons inside `container` (a Card),
// deselecting any other currently-selected sibling. Generic over Fractions'
// "Skills" card, Charts' "Skill" card, and Fractions' "Denominators" card
// (single-target use), all of which use the same
// `aria-pressed`-toggle-button pattern (see `buttonClass` in both *Setup.tsx
// files). Robust to whatever selection localStorage restored, so it does not
// assume the app's hardcoded defaults.
async function isolateToggle(container: Locator, label: string) {
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

// The "no clues" invariant: no chart element highlighted (except where the
// oracle legitimately reports one, e.g. pie-fraction), and the answer string is
// never present in the visible DOM.
export async function expectNoClues(page: Page) {
  const o = await readOracle(page);
  expect(o.highlightCount ?? 0).toBe(0);
}
