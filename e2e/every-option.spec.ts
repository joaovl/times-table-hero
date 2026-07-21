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
import { test, expect } from './fixtures';
import {
  skillsCard,
  isolateToggleByIndex,
  selectOperationByIndex,
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
  'times-tables',
  'arithmetic',
  'decimals',
  'fractions',
  'shapes',
]);

const LEVELS = ['easy', 'medium', 'hard'] as const;

// A few options use bespoke input widgets that can't be driven by the generic
// oracle answerer (e.g. tap-in-order, drag/plot on a grid, or a re-tap that
// toggles selection off, which the answer-retry loop can't use). These stay
// covered by the unit answer-integrity net; here they show as skipped with the
// reason, so the browser run still names them.
const SKIP: Record<string, string> = {
  'decimals/compare-decimals': 'tap-in-order widget (re-tap toggles off); covered by unit answer-integrity',
  // Mixed-number answers use a 3-field (whole + num/den) input the generic
  // answerer can't drive; covered by unit answer-integrity.
  'fractions/mixed-mul-whole': 'mixed-number (3-field) input; covered by unit answer-integrity',
  'fractions/add-mixed': 'mixed-number (3-field) input; covered by unit answer-integrity',
  'fractions/sub-mixed': 'mixed-number (3-field) input; covered by unit answer-integrity',
  'fractions/mul-by-whole': 'whole+fraction (multi-field) input; covered by unit answer-integrity',
  // Shapes skills answered by plotting/clicking on a coordinate grid — no text
  // answer to drive; covered by unit answer-integrity.
  'shapes/coord-plot': 'plot a point on a grid (click); covered by unit answer-integrity',
  'shapes/coord-four-quadrants': 'plot on a 4-quadrant grid (click); covered by unit answer-integrity',
  'shapes/translation': 'translate a shape on a grid (click); covered by unit answer-integrity',
};

for (const mod of catalog as ModuleEntry[]) {
  if (!DRIVABLE.has(mod.slug)) continue;

  test.describe(mod.slug, () => {
    mod.options.forEach((option, index) => {
      const levels = mod.difficulty ? LEVELS : ([null] as const);
      for (const level of levels) {
        const name = level ? `${option} › ${level}` : option;
        const skipReason = SKIP[`${mod.slug}/${option}`];
        test(name, async ({ page }) => {
          test.skip(!!skipReason, skipReason);
          await page.goto(mod.route);
          if (mod.kind === 'operation') {
            await selectOperationByIndex(page, mod.heading, index);
          } else {
            await isolateToggleByIndex(skillsCard(page, mod.heading), index);
          }
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
