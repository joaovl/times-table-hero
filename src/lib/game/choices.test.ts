import { describe, it, expect } from 'vitest';
import {
  numericChoicesWithNone,
  isChoiceCorrect,
  NONE_OF_THESE,
} from './choices';

// Grader for a question whose only correct plain-integer answer is `target`.
const graderFor = (target: number) => (c: string) => Number(c) !== target;

describe('numericChoicesWithNone', () => {
  it('when not hiding: shows the correct answer plus a None button, only the number is correct', () => {
    const isWrong = graderFor(56);
    const opts = numericChoicesWithNone(56, isWrong, String, false);
    expect(opts).toContain('56');
    expect(opts).toContain(NONE_OF_THESE);
    expect(isChoiceCorrect('56', opts, isWrong)).toBe(true);
    expect(isChoiceCorrect(NONE_OF_THESE, opts, isWrong)).toBe(false);
    // exactly one correct option overall
    expect(opts.filter(o => isChoiceCorrect(o, opts, isWrong)).length).toBe(1);
  });

  it('when hiding: omits the correct answer so None of these is the correct pick', () => {
    const isWrong = graderFor(56);
    const opts = numericChoicesWithNone(56, isWrong, String, true);
    expect(opts).not.toContain('56');
    expect(opts).toContain(NONE_OF_THESE);
    expect(isChoiceCorrect(NONE_OF_THESE, opts, isWrong)).toBe(true);
    // every shown numeric option is wrong
    for (const o of opts) {
      if (o !== NONE_OF_THESE) expect(isWrong(o)).toBe(true);
    }
    expect(opts.filter(o => isChoiceCorrect(o, opts, isWrong)).length).toBe(1);
  });

  it('bails to typed (returns []) when the grader rejects the canonical answer string', () => {
    // Grader that never accepts a plain integer (e.g. it needs a "£" prefix).
    const needsPrefix = () => true;
    expect(numericChoicesWithNone(56, needsPrefix, String, false)).toEqual([]);
  });
});

describe('isChoiceCorrect', () => {
  it('marks None of these correct only when no shown number is the answer', () => {
    const isWrong = graderFor(10);
    const hidden = ['7', '12', '9', NONE_OF_THESE];
    const shown = ['10', '12', '9', NONE_OF_THESE];
    expect(isChoiceCorrect(NONE_OF_THESE, hidden, isWrong)).toBe(true);
    expect(isChoiceCorrect(NONE_OF_THESE, shown, isWrong)).toBe(false);
  });
});
