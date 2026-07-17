// e2e/bugs/charts-no-clue.spec.ts
import { test, expect } from '@playwright/test';
import { startCharts } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #10: charts must not highlight the queried bar/point.
//
// The default game mode serves exactly 10 questions (see QUESTION_COUNTS /
// DEFAULT_SETTINGS.questionCount in ChartsSetup.tsx / storage.ts), so the
// loop below is bounded at 5 - well within a single game - and each
// iteration still has a "next question" to wait for.
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
