// e2e/bugs/fractions-variety.spec.ts
import { test, expect } from '@playwright/test';
import { startFractions, questionSignature, answerFractionOp } from '../support/play';
import { readOracle } from '../support/oracle';

// Bug #7/#8: fractions used to serve the same question over and over.
test('fractions does not repeat the same question consecutively', async ({ page }) => {
  await startFractions(page, { skill: 'add-same', denominators: [2, 3, 4] });

  // The default game mode serves exactly 10 questions (see QUESTION_COUNTS /
  // DEFAULT_SETTINGS.questionCount in FractionsSetup.tsx / storage.ts), so
  // the loop is bounded at 10 rather than 12 to stay within a single game.
  // After the last question the game ends and the oracle node is replaced by
  // the results screen, so only wait for a "next question" transition when
  // there actually is a next question.
  const TOTAL_QUESTIONS = 10;
  const signatures: string[] = [];
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const sig = await questionSignature(page);
    signatures.push(sig);
    const { expected } = await readOracle(page);
    await answerFractionOp(page, expected);
    if (i < TOTAL_QUESTIONS - 1) {
      // Wait for the next question by the oracle's questionId changing.
      await expect
        .poll(async () => (await readOracle(page).catch(() => ({ questionId: sig }))).questionId)
        .not.toBe(sig);
    }
  }

  // No two consecutive questions identical, and a healthy spread overall.
  for (let i = 1; i < signatures.length; i++) {
    expect(signatures[i], 'consecutive questions must differ').not.toBe(signatures[i - 1]);
  }
  expect(new Set(signatures).size, 'should see several distinct questions').toBeGreaterThan(3);
});
