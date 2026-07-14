import { describe, it, expect } from 'vitest';

// Cross-module invariant for the easy/medium multiple-choice options: whenever
// a module offers choices, exactly one option is graded correct, the list has
// no duplicates, and it contains the canonical answer. We also assert that the
// all-integer modules actually DO offer choices (i.e. the wiring is live, not
// silently falling back to typed everywhere).

import * as stats from '@/modules/statistics/logic';
import * as ns from '@/modules/number-sense/logic';
import * as alg from '@/modules/algebra/logic';

type Diff = 'easy' | 'medium';

describe('multiple-choice answer options', () => {
  it('statistics: offers choices with exactly one correct (easy/medium)', () => {
    let offered = 0;
    for (const difficulty of ['easy', 'medium'] as Diff[]) {
      const qs = stats.generateStatsQuestions(
        { skills: stats.ALL_SKILLS, difficulty, gameMode: 'questions', questionCount: 100, timeLimit: 60 },
        100,
      );
      for (const q of qs) {
        const opts = stats.generateChoices(q, difficulty);
        if (opts.length === 0) continue;
        offered++;
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts).toContain(stats.answerText(q));
        expect(opts.filter(o => stats.checkStatsAnswer(q, o)).length).toBe(1);
      }
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('number-sense: numeric skills offer choices with exactly one correct', () => {
    let offered = 0;
    for (const difficulty of ['easy', 'medium'] as Diff[]) {
      const qs = ns.generateNumberSenseQuestions(
        { skills: ns.ALL_SKILLS, difficulty, gameMode: 'questions', questionCount: 120, timeLimit: 60 },
        120,
      );
      for (const q of qs) {
        const opts = ns.generateChoices(q, difficulty);
        if (opts.length === 0) continue;
        offered++;
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts).toContain(ns.answerText(q));
        expect(opts.filter(o => ns.checkNumberSenseAnswer(q, o)).length).toBe(1);
      }
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('algebra: numeric skills offer choices with exactly one correct', () => {
    let offered = 0;
    for (const difficulty of ['easy', 'medium'] as Diff[]) {
      const qs = alg.generateAlgebraQuestions(
        { skills: alg.ALL_SKILLS, difficulty, gameMode: 'questions', questionCount: 120, timeLimit: 60 },
        120,
      );
      for (const q of qs) {
        const opts = alg.generateChoices(q, difficulty);
        if (opts.length === 0) continue;
        offered++;
        expect(new Set(opts).size).toBe(opts.length);
        expect(opts).toContain(alg.answerText(q));
        expect(opts.filter(o => alg.checkAlgebraAnswer(q, o)).length).toBe(1);
      }
    }
    expect(offered).toBeGreaterThan(0);
  });
});
