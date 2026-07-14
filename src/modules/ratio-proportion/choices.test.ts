import { describe, it, expect } from 'vitest';
import {
  generateRatioQuestions,
  generateRatioChoices,
  checkRatioAnswer,
  answerText,
  ALL_SKILLS,
  type Difficulty,
} from './logic';

// Meta-invariant across every skill and both non-hard difficulties: the option
// list contains the correct answer, has no duplicates, and grades exactly one
// option as correct.
describe('generateRatioChoices', () => {
  for (const difficulty of ['easy', 'medium'] as Difficulty[]) {
    it(`produces one correct option per question (${difficulty})`, () => {
      const qs = generateRatioQuestions(
        { skills: ALL_SKILLS, difficulty, gameMode: 'questions', questionCount: 120, timeLimit: 60 },
        120,
      );
      for (const q of qs) {
        const opts = generateRatioChoices(q, difficulty);
        expect(opts.length).toBeGreaterThanOrEqual(2);
        expect(new Set(opts).size).toBe(opts.length); // no duplicates
        expect(opts).toContain(answerText(q));
        const correctCount = opts.filter(o => checkRatioAnswer(q, o)).length;
        expect(correctCount).toBe(1);
      }
    });
  }
});
