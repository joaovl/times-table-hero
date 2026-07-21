// e2e/auto-player.spec.ts
//
// Full-stack "every area is playable" regression. For each module that exposes
// the e2e oracle, this starts a real game (built app + wrangler Functions + D1)
// and plays several questions by reading the oracle's correct answer and
// submitting it — proving the whole chain works: setup -> play -> oracle ->
// answer submission -> advance. Grading *correctness* itself is proven at the
// unit layer (src/lib/e2e/oracleRollout.test.ts + testkit answerIntegrity),
// so here we assert the game progresses through each answered question.
//
// The complex multi-field / pick modules (decimals, fractions, shapes, money)
// are intentionally excluded — they don't expose a whole-question oracle and
// stay covered by the Layer 1 answer-integrity net.
import { test } from '@playwright/test';
import { startModuleByRoute, answerAndAdvance } from './support/play';

const MODULES: Array<{ slug: string; route: string }> = [
  { slug: 'charts', route: '/charts' },
  { slug: 'times-tables', route: '/times-tables' },
  { slug: 'arithmetic', route: '/arithmetic' },
  { slug: 'number-sense', route: '/number-sense' },
  { slug: 'conversions', route: '/conversions' },
  { slug: 'word-problems', route: '/word-problems' },
  { slug: 'algebra', route: '/algebra' },
  { slug: 'statistics', route: '/statistics' },
  { slug: 'ratio-proportion', route: '/ratio-proportion' },
  { slug: 'time', route: '/time' },
];

const QUESTIONS_TO_PLAY = 5;

for (const { slug, route } of MODULES) {
  test(`auto-play ${slug}: game progresses on correct answers`, async ({ page }) => {
    await startModuleByRoute(page, route);
    for (let i = 0; i < QUESTIONS_TO_PLAY; i++) {
      // Answer with the oracle's correct answer; the game must advance.
      await answerAndAdvance(page);
    }
  });
}
