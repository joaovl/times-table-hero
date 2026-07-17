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
