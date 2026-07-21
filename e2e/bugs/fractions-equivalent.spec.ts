// e2e/bugs/fractions-equivalent.spec.ts
import { test, expect } from '../fixtures';
import { startFractions, answerFractionOp } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #9: an equivalent, unsimplified answer (10/16 for 5/8) must be accepted as
// correct with a simplest-form nudge — not marked wrong.
test('equivalent unsimplified fraction is accepted with a simplest-form nudge', async ({ page }) => {
  await startFractions(page, { skill: 'add-diff', denominators: [2, 4, 8] });

  // The e2e build collapses feedback to 30ms, far too short to assert on the
  // transient "Correct!" text (and impossible under a slowed headed run).
  // Widen the window for this spec via the e2e-only runtime knob.
  await page.evaluate(() => sessionStorage.setItem('tth-e2e-feedback-ms', '8000'));

  const { expected } = await readOracle(page); // e.g. "5/8"
  const [n, d] = expected.split('/').map(Number);
  await answerFractionOp(page, `${n * 2}/${d * 2}`); // e.g. "10/16"

  // Positive feedback, NOT an incorrect state.
  await expect(page.getByText(/Correct!|Brilliant!/)).toBeVisible();
  await expect(page.getByText(`${n}/${d} is the simplest form`)).toBeVisible();
});
