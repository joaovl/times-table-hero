import { describe, it, expect } from 'vitest';
import {
  gcd,
  simplifyFrac,
  fracEquals,
  fracIsSimplified,
  generateFractionQuestions,
  ALL_SKILLS,
  type FractionSettings,
  type FractionSkill,
} from './logic';

const baseSettings = (over: Partial<FractionSettings> = {}): FractionSettings => ({
  skills: ['add-same'],
  denominators: [2, 3, 4],
  simplify: true,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('gcd', () => {
  it.each([
    [12, 8, 4],
    [10, 5, 5],
    [7, 13, 1],
    [100, 75, 25],
    [0, 5, 5],
    [5, 0, 5],
    [-12, 8, 4],
  ])('gcd(%i, %i) = %i', (a, b, expected) => {
    expect(gcd(a, b)).toBe(expected);
  });

  it('gcd(0, 0) defends with 1', () => {
    expect(gcd(0, 0)).toBe(1);
  });
});

describe('simplifyFrac', () => {
  it('reduces by gcd', () => {
    expect(simplifyFrac({ num: 2, den: 4 })).toEqual({ num: 1, den: 2 });
    expect(simplifyFrac({ num: 6, den: 8 })).toEqual({ num: 3, den: 4 });
    expect(simplifyFrac({ num: 15, den: 25 })).toEqual({ num: 3, den: 5 });
  });

  it('already-simplified fraction is unchanged', () => {
    expect(simplifyFrac({ num: 3, den: 5 })).toEqual({ num: 3, den: 5 });
    expect(simplifyFrac({ num: 1, den: 7 })).toEqual({ num: 1, den: 7 });
  });

  it('reduces 0/n to 0/1 (gcd(0, n) = n)', () => {
    expect(simplifyFrac({ num: 0, den: 5 })).toEqual({ num: 0, den: 1 });
  });
});

describe('fracEquals / fracIsSimplified', () => {
  it('cross-multiplication equivalence', () => {
    expect(fracEquals({ num: 1, den: 2 }, { num: 2, den: 4 })).toBe(true);
    expect(fracEquals({ num: 3, den: 4 }, { num: 6, den: 8 })).toBe(true);
    expect(fracEquals({ num: 1, den: 3 }, { num: 1, den: 4 })).toBe(false);
  });

  it('identifies simplest form', () => {
    expect(fracIsSimplified({ num: 1, den: 2 })).toBe(true);
    expect(fracIsSimplified({ num: 3, den: 4 })).toBe(true);
    expect(fracIsSimplified({ num: 2, den: 4 })).toBe(false);
    expect(fracIsSimplified({ num: 6, den: 8 })).toBe(false);
  });
});

describe('generateFractionQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateFractionQuestions(baseSettings(), 25);
    expect(qs).toHaveLength(25);
  });
});

describe('generateFractionQuestions — answer math is correct', () => {
  // For every skill, verify the emitted answer is mathematically correct via
  // cross-multiplication against the raw operands.
  it('add-same: (a + b)/d = answer (in equivalent form)', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-same'], denominators: [3, 4, 5, 6, 7, 8] }),
      80
    );
    qs.forEach(q => {
      expect(q.skill).toBe('add-same');
      expect(q.a.den).toBe(q.b.den);
      const rawNum = q.a.num + q.b.num;
      const rawDen = q.a.den;
      // q.answer.num / q.answer.den == rawNum / rawDen
      expect(q.answer.num * rawDen).toBe(rawNum * q.answer.den);
    });
  });

  it('sub-same: (a - b)/d = answer; a >= b; no negatives', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['sub-same'], denominators: [3, 4, 5, 6, 7, 8] }),
      80
    );
    qs.forEach(q => {
      expect(q.skill).toBe('sub-same');
      expect(q.a.den).toBe(q.b.den);
      expect(q.a.num).toBeGreaterThanOrEqual(q.b.num);
      expect(q.answer.num).toBeGreaterThan(0);
      const rawNum = q.a.num - q.b.num;
      const rawDen = q.a.den;
      expect(q.answer.num * rawDen).toBe(rawNum * q.answer.den);
    });
  });

  it('add-diff: cross-multiplied numerator over d1*d2 = answer', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-diff'], denominators: [2, 3, 4, 5, 6, 7] }),
      80
    );
    qs.forEach(q => {
      expect(q.skill).toBe('add-diff');
      expect(q.a.den).not.toBe(q.b.den);
      const rawNum = q.a.num * q.b.den + q.b.num * q.a.den;
      const rawDen = q.a.den * q.b.den;
      expect(q.answer.num * rawDen).toBe(rawNum * q.answer.den);
    });
  });

  it('sub-diff: cross-multiplied numerator over d1*d2 = answer; a/d1 >= b/d2', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['sub-diff'], denominators: [2, 3, 4, 5, 6, 7] }),
      80
    );
    qs.forEach(q => {
      expect(q.skill).toBe('sub-diff');
      expect(q.a.den).not.toBe(q.b.den);
      // a/d1 >= b/d2
      expect(q.a.num * q.b.den).toBeGreaterThanOrEqual(q.b.num * q.a.den);
      expect(q.answer.num).toBeGreaterThan(0);
      const rawNum = q.a.num * q.b.den - q.b.num * q.a.den;
      const rawDen = q.a.den * q.b.den;
      expect(q.answer.num * rawDen).toBe(rawNum * q.answer.den);
    });
  });
});

describe('generateFractionQuestions — simplification', () => {
  it('every answer is in simplest form when simplify: true', () => {
    for (const skill of ALL_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({
          skills: [skill],
          denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          simplify: true,
        }),
        60
      );
      qs.forEach(q => {
        expect(
          fracIsSimplified(q.answer),
          `${skill} produced non-simplified ${q.answer.num}/${q.answer.den}`
        ).toBe(true);
      });
    }
  });
});

describe('generateFractionQuestions — denominators belong to the selected set', () => {
  it('same-denom skills use a denominator from the set', () => {
    const dens = [4, 8, 12];
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-same', 'sub-same'], denominators: dens, simplify: false }),
      60
    );
    qs.forEach(q => {
      expect(dens).toContain(q.a.den);
      expect(dens).toContain(q.b.den);
    });
  });

  it('diff-denom skills draw both operand denominators from the set', () => {
    const dens = [2, 5, 7, 11];
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-diff', 'sub-diff'], denominators: dens, simplify: false }),
      60
    );
    qs.forEach(q => {
      expect(dens).toContain(q.a.den);
      expect(dens).toContain(q.b.den);
      expect(q.a.den).not.toBe(q.b.den);
    });
  });
});

describe('generateFractionQuestions — kid-friendly v1 constraints', () => {
  it('no answer is zero', () => {
    for (const skill of ALL_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({ skills: [skill], denominators: [2, 3, 4, 5, 6, 7, 8], simplify: true }),
        40
      );
      qs.forEach(q => {
        expect(q.answer.num, `${skill} produced zero answer`).not.toBe(0);
      });
    }
  });

  it('no improper answers (num < den)', () => {
    for (const skill of ALL_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({ skills: [skill], denominators: [2, 3, 4, 5, 6, 7, 8], simplify: true }),
        40
      );
      qs.forEach(q => {
        expect(q.answer.num, `${skill} improper ${q.answer.num}/${q.answer.den}`).toBeLessThan(q.answer.den);
        expect(q.answer.num).toBeGreaterThan(0);
      });
    }
  });
});

describe('generateFractionQuestions — multi-skill mix', () => {
  it('produces all selected skills given enough questions', () => {
    const skills: FractionSkill[] = ['add-same', 'sub-same', 'add-diff', 'sub-diff'];
    const qs = generateFractionQuestions(
      baseSettings({ skills, denominators: [3, 4, 5, 6], simplify: true }),
      400
    );
    const observed = new Set(qs.map(q => q.skill));
    skills.forEach(s => expect(observed.has(s), `${s} never emitted in 400 samples`).toBe(true));
  });
});
