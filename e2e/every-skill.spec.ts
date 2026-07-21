// e2e/every-skill.spec.ts
//
// Exhaustive functional coverage in a real browser: for every oracle-backed
// module this walks EVERY skill in the setup screen and, where the module has
// a difficulty selector, EVERY level (easy/medium/hard), starting a real game
// for each combination and answering a question via the oracle. This is the
// "every option, every level is actually played in Chrome" regression.
//
// Skill lists are discovered from the live setup toggles (not hard-coded), so
// adding a skill to a module automatically extends coverage here. Modules with
// bespoke operation pickers (times-tables, arithmetic) and the complex
// multi-field/pick modules (decimals, fractions, shapes, money) are covered by
// the unit-level answer-integrity net instead.
import { test, expect } from '@playwright/test';
import {
  skillsCard,
  countSkillToggles,
  isolateToggleByIndex,
  setDifficultyIfPresent,
  pressStart,
  answerAndAdvance,
} from './support/play';

const MODULES: Array<{ slug: string; route: string; heading: string }> = [
  { slug: 'charts', route: '/charts', heading: 'Skill' },
  { slug: 'number-sense', route: '/number-sense', heading: 'Skills' },
  { slug: 'conversions', route: '/conversions', heading: 'Skills' },
  { slug: 'word-problems', route: '/word-problems', heading: 'Skills' },
  { slug: 'algebra', route: '/algebra', heading: 'Skills' },
  { slug: 'statistics', route: '/statistics', heading: 'Skills' },
  { slug: 'ratio-proportion', route: '/ratio-proportion', heading: 'Skills' },
  { slug: 'time', route: '/time', heading: 'Skill' },
];

const LEVELS = ['easy', 'medium', 'hard'] as const;

for (const { slug, route, heading } of MODULES) {
  test(`every skill x level plays: ${slug}`, async ({ page }) => {
    // These walk the whole option matrix, so they need a generous budget.
    test.setTimeout(300_000);

    await page.goto(route);
    const skillCount = await countSkillToggles(page, heading);
    expect(skillCount, `${slug}: no skill toggles found under "${heading}"`).toBeGreaterThan(0);

    const hasDifficulty = (await page.getByRole('button', { name: /^easy$/i }).count()) > 0;
    const levels = hasDifficulty ? LEVELS : ([null] as const);

    for (let i = 0; i < skillCount; i++) {
      for (const level of levels) {
        await page.goto(route); // reset selection/persisted state
        await isolateToggleByIndex(skillsCard(page, heading), i);
        if (level) await setDifficultyIfPresent(page, level);
        await pressStart(page);
        // Play one question at this skill/level: proves generate -> render ->
        // oracle -> correct answer accepted -> advance for this exact option.
        await answerAndAdvance(page);
      }
    }
  });
}
