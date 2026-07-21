// e2e/every-option.spec.ts
//
// One clearly-named browser test PER OPTION for every module: it selects a
// single skill (or operation) and difficulty on the real setup screen, starts
// a game, and answers a question via the oracle. Test names read as
// "<module> > <option> > <level>" so the run is self-documenting.
//
// The option list per module is generated from source into support/catalog.json
// (npm run gen:e2e-catalog), so adding a skill automatically adds a test here.
//
// DRIVABLE lists the modules whose input widgets the generic answerer can drive
// today. Modules are moved in as their oracle + widget support lands; until
// then their options are covered by the unit-level answer-integrity net.
import { test, expect } from '@playwright/test';
import {
  skillsCard,
  isolateToggleByIndex,
  setDifficultyIfPresent,
  pressStart,
  answerAndAdvance,
} from './support/play';
import catalog from './support/catalog.json' with { type: 'json' };

interface ModuleEntry {
  slug: string;
  route: string;
  heading: string;
  difficulty: boolean;
  kind: 'skill' | 'operation';
  options: string[];
}

const DRIVABLE = new Set([
  'charts',
  'number-sense',
  'conversions',
  'word-problems',
  'algebra',
  'statistics',
  'ratio-proportion',
  'time',
  'number-theory',
  'money',
]);

const LEVELS = ['easy', 'medium', 'hard'] as const;

for (const mod of catalog as ModuleEntry[]) {
  if (!DRIVABLE.has(mod.slug) || mod.kind !== 'skill') continue;

  test.describe(mod.slug, () => {
    mod.options.forEach((option, index) => {
      const levels = mod.difficulty ? LEVELS : ([null] as const);
      for (const level of levels) {
        const name = level ? `${option} › ${level}` : option;
        test(name, async ({ page }) => {
          await page.goto(mod.route);
          await isolateToggleByIndex(skillsCard(page, mod.heading), index);
          if (level) await setDifficultyIfPresent(page, level);
          await pressStart(page);
          // Confirm this exact option produced a real question, then answer it.
          await expect(page.getByTestId('e2e-oracle')).toBeAttached();
          await answerAndAdvance(page);
        });
      }
    });
  });
}
