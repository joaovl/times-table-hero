// @vitest-environment jsdom
//
// Generic answer-integrity regression net. For every registered module × skill
// it generates questions and asserts the answer path is sound: the canonical
// answer grades correct, any multiple-choice set contains exactly one correct
// option, and there are no duplicate options. This is the layer that would have
// caught the charts value-label give-away (a knowing player's answer must be
// accepted AND present among the buttons).
import { describe, it, expect } from 'vitest';
import { ALL_MODULES } from './registry';

const K = 25;
const NONE = 'None of these';

for (const m of ALL_MODULES) {
  describe(`answer integrity: ${m.slug}`, () => {
    for (const skill of m.skills) {
      it(`"${skill}" — canonical answer accepted, options sound`, () => {
        const qs = m.generate(m.settingsFor(skill), K);
        expect(qs.length, `${m.slug}/${skill} generator produced no questions`).toBeGreaterThan(0);
        for (const q of qs) {
          const correct = m.correctAnswer(q);

          // 1. The canonical answer grades correct.
          expect(
            m.isCorrect(q, correct),
            `${m.slug}/${skill} rejected its own answer "${correct}": ${JSON.stringify(q)}`,
          ).toBe(true);

          // 2/3. If choices show, exactly one grades correct — unless the true
          // answer was intentionally hidden, in which case 'None of these' is
          // the sole correct pick.
          const choices = m.choices(q);
          if (choices.length > 0) {
            const correctCount = choices.filter(c => c !== NONE && m.isCorrect(q, c)).length;
            const noneIsCorrect =
              choices.includes(NONE) && choices.every(c => c === NONE || !m.isCorrect(q, c));
            expect(
              correctCount === 1 || noneIsCorrect,
              `${m.slug}/${skill} unsound choices ${JSON.stringify(choices)} for ${JSON.stringify(q)}`,
            ).toBe(true);

            // No duplicate option strings.
            expect(
              new Set(choices).size,
              `${m.slug}/${skill} duplicate options ${JSON.stringify(choices)}`,
            ).toBe(choices.length);
          }
        }
      });
    }
  });
}

// Guard against an empty registry silently passing.
it('registry is non-empty', () => {
  expect(ALL_MODULES.length).toBeGreaterThan(0);
});
