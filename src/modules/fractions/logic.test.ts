import { describe, it, expect } from 'vitest';
import {
  gcd,
  simplifyFrac,
  fracEquals,
  fracIsSimplified,
  generateFractionQuestions,
  compareFrac,
  toMixed,
  toImproper,
  isOpQuestion,
  isIdQuestion,
  isEqQuestion,
  isCmpQuestion,
  isMixedQuestion,
  isMulByWholeQuestion,
  isMixedMulWholeQuestion,
  isMulFracQuestion,
  isToDecimalQuestion,
  isFromDecimalQuestion,
  isMixedAddSubQuestion,
  isDivFracWholeQuestion,
  answerToImproper,
  mulAnswerAccepted,
  decimalAnswerAccepted,
  CURRICULUM_TAGS,
  ALL_SKILLS,
  type FractionSettings,
  type FractionSkill,
} from './logic';

// The original four op-style skills. The kid-friendly v1 invariants (proper
// answers, simplest form, etc.) only apply to these; the new v2 skills
// (id/eq/cmp/mixed) have their own shape and constraints.
const OP_SKILLS: FractionSkill[] = ['add-same', 'sub-same', 'add-diff', 'sub-diff'];

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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
  it('every op-skill answer is in simplest form when simplify: true', () => {
    // Simplification is an op-skill invariant. id accepts equivalent forms;
    // eq deliberately renders non-simplified targets (that's the point of
    // the skill); cmp/mixed don't carry a Frac answer.
    for (const skill of OP_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({
          skills: [skill],
          denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          simplify: true,
        }),
        60
      );
      qs.forEach(q => {
        if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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
      if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
      expect(dens).toContain(q.a.den);
      expect(dens).toContain(q.b.den);
      expect(q.a.den).not.toBe(q.b.den);
    });
  });
});

describe('generateFractionQuestions — kid-friendly v1 constraints', () => {
  it('no op-skill answer is zero', () => {
    for (const skill of OP_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({ skills: [skill], denominators: [2, 3, 4, 5, 6, 7, 8], simplify: true }),
        40
      );
      qs.forEach(q => {
        if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
        expect(q.answer.num, `${skill} produced zero answer`).not.toBe(0);
      });
    }
  });

  it('no improper op-skill answers (num < den)', () => {
    for (const skill of OP_SKILLS) {
      const qs = generateFractionQuestions(
        baseSettings({ skills: [skill], denominators: [2, 3, 4, 5, 6, 7, 8], simplify: true }),
        40
      );
      qs.forEach(q => {
        if (!isOpQuestion(q)) throw new Error(`expected op-shaped, got ${q.skill}`);
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

  it('produces every v2 skill given enough questions', () => {
    const skills: FractionSkill[] = ['id', 'eq', 'cmp', 'mixed'];
    const qs = generateFractionQuestions(
      baseSettings({ skills, denominators: [2, 3, 4, 5, 6, 8], simplify: true }),
      400
    );
    const observed = new Set(qs.map(q => q.skill));
    skills.forEach(s => expect(observed.has(s), `${s} never emitted in 400 samples`).toBe(true));
  });

  it('mixing all 8 skills emits every skill at least once', () => {
    const qs = generateFractionQuestions(
      baseSettings({
        skills: ALL_SKILLS,
        denominators: [2, 3, 4, 5, 6, 8],
        simplify: true,
      }),
      800
    );
    const observed = new Set(qs.map(q => q.skill));
    ALL_SKILLS.forEach(s =>
      expect(observed.has(s), `${s} never emitted in 800 samples`).toBe(true)
    );
  });
});

describe('compareFrac', () => {
  it.each<[number, number, number, number, '<' | '=' | '>']>([
    [1, 2, 1, 3, '>'],
    [1, 3, 1, 2, '<'],
    [1, 2, 2, 4, '='],
    [3, 4, 5, 8, '>'],
    [2, 5, 3, 7, '<'],
  ])('compareFrac(%i/%i, %i/%i) = %s', (an, ad, bn, bd, expected) => {
    expect(compareFrac({ num: an, den: ad }, { num: bn, den: bd })).toBe(expected);
  });
});

describe('toMixed / toImproper round-trip', () => {
  it('converts improper -> mixed correctly', () => {
    expect(toMixed({ num: 7, den: 3 })).toEqual({ whole: 2, num: 1, den: 3 });
    expect(toMixed({ num: 10, den: 4 })).toEqual({ whole: 2, num: 2, den: 4 });
    expect(toMixed({ num: 5, den: 5 })).toEqual({ whole: 1, num: 0, den: 5 });
  });

  it('converts mixed -> improper correctly', () => {
    expect(toImproper({ whole: 2, num: 1, den: 3 })).toEqual({ num: 7, den: 3 });
    expect(toImproper({ whole: 3, num: 2, den: 5 })).toEqual({ num: 17, den: 5 });
  });

  it('round-trips for many random pairs', () => {
    for (let i = 0; i < 50; i++) {
      const whole = 1 + Math.floor(Math.random() * 6);
      const den = 2 + Math.floor(Math.random() * 9);
      const num = Math.floor(Math.random() * (den - 1));
      const m = { whole, num, den };
      const imp = toImproper(m);
      const back = toMixed(imp);
      expect(back).toEqual(m);
    }
  });
});

describe('generateFractionQuestions — id skill', () => {
  it('always produces an id-shaped question when skill is id', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['id'], denominators: [2, 3, 4, 5, 6, 8] }),
      40
    );
    qs.forEach(q => {
      expect(isIdQuestion(q)).toBe(true);
      if (!isIdQuestion(q)) return;
      expect(q.figure === 'circle' || q.figure === 'rect').toBe(true);
      expect(q.shaded).toBeGreaterThanOrEqual(1);
      expect(q.shaded).toBeLessThan(q.total);
      expect(q.answer.num).toBe(q.shaded);
      expect(q.answer.den).toBe(q.total);
    });
  });

  it('respects circle cap (<=8) and rect cap (<=12)', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['id'], denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
      80
    );
    qs.forEach(q => {
      if (!isIdQuestion(q)) return;
      if (q.figure === 'circle') expect(q.total).toBeLessThanOrEqual(8);
      else expect(q.total).toBeLessThanOrEqual(12);
    });
  });
});

describe('generateFractionQuestions — eq skill', () => {
  it('target is k * source for k >= 2 and missing field matches answer', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['eq'], denominators: [2, 3, 4, 5, 6] }),
      40
    );
    qs.forEach(q => {
      expect(isEqQuestion(q)).toBe(true);
      if (!isEqQuestion(q)) return;
      // target/source must be equivalent fractions
      expect(fracEquals(q.source, q.target)).toBe(true);
      // missing-field consistency
      if (q.missing === 'num') expect(q.answer).toBe(q.target.num);
      else expect(q.answer).toBe(q.target.den);
      // target is strictly bigger than source (k >= 2)
      expect(q.target.den).toBeGreaterThan(q.source.den);
    });
  });
});

describe('generateFractionQuestions — cmp skill', () => {
  it('answer is one of <, =, > and matches compareFrac', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['cmp'], denominators: [2, 3, 4, 5, 6, 8] }),
      60
    );
    qs.forEach(q => {
      expect(isCmpQuestion(q)).toBe(true);
      if (!isCmpQuestion(q)) return;
      expect(['<', '=', '>']).toContain(q.answer);
      expect(compareFrac(q.a, q.b)).toBe(q.answer);
    });
  });
});

describe('generateFractionQuestions — mixed skill', () => {
  it('improper and mixed are equivalent, direction is set', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mixed'], denominators: [2, 3, 4, 5, 6] }),
      40
    );
    qs.forEach(q => {
      expect(isMixedQuestion(q)).toBe(true);
      if (!isMixedQuestion(q)) return;
      expect(['to-mixed', 'to-improper']).toContain(q.direction);
      // improper.num/den == whole + num/den
      const expectedImpNum = q.mixed.whole * q.mixed.den + q.mixed.num;
      expect(q.improper.num).toBe(expectedImpNum);
      expect(q.improper.den).toBe(q.mixed.den);
      // No degenerate whole=0 cases.
      expect(q.mixed.whole).toBeGreaterThanOrEqual(1);
    });
  });
});

// ----- v3 skills: mul-by-whole / mixed-mul-whole / mul-frac /
// to-decimal / from-decimal --------------------------------------------

describe('ALL_SKILLS + CURRICULUM_TAGS coverage', () => {
  it('ALL_SKILLS contains every defined skill', () => {
    expect(ALL_SKILLS.length).toBeGreaterThanOrEqual(16);
    expect(ALL_SKILLS).toContain('mul-by-whole');
    expect(ALL_SKILLS).toContain('mixed-mul-whole');
    expect(ALL_SKILLS).toContain('mul-frac');
    expect(ALL_SKILLS).toContain('to-decimal');
    expect(ALL_SKILLS).toContain('from-decimal');
    expect(ALL_SKILLS).toContain('add-mixed');
    expect(ALL_SKILLS).toContain('sub-mixed');
    expect(ALL_SKILLS).toContain('div-frac-whole');
  });

  it('CURRICULUM_TAGS has an entry for every skill', () => {
    ALL_SKILLS.forEach(s => {
      expect(CURRICULUM_TAGS[s], `missing curriculum tag for ${s}`).toBeDefined();
      expect(CURRICULUM_TAGS[s].strand).toBeTruthy();
      expect(CURRICULUM_TAGS[s].year).toBeTruthy();
    });
  });

  it('v3 mul/decimal skills are tagged Y5 / Y4-Y5', () => {
    expect(CURRICULUM_TAGS['mul-by-whole'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['mixed-mul-whole'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['mul-frac'].year).toBe('Y5');
    expect(['Y4/Y5', 'Y4', 'Y5']).toContain(CURRICULUM_TAGS['to-decimal'].year);
    expect(['Y4/Y5', 'Y4', 'Y5']).toContain(CURRICULUM_TAGS['from-decimal'].year);
  });
});

describe('answerToImproper', () => {
  it('converts mixed answer (whole + num/den) into improper', () => {
    expect(answerToImproper({ whole: 1, num: 1, den: 2 })).toEqual({ num: 3, den: 2 });
    expect(answerToImproper({ whole: 2, num: 1, den: 3 })).toEqual({ num: 7, den: 3 });
  });
  it('treats missing whole as 0', () => {
    expect(answerToImproper({ num: 1, den: 4 })).toEqual({ num: 1, den: 4 });
  });
  it('handles pure whole (num=0, den=1)', () => {
    expect(answerToImproper({ whole: 3, num: 0, den: 1 })).toEqual({ num: 3, den: 1 });
  });
});

describe('mulAnswerAccepted', () => {
  // Canonical for 1/4 × 6 = 6/4 = 1 1/2.
  const canonical = { whole: 1, num: 1, den: 2 };

  it.each<[string, { kind: 'improper'; value: { num: number; den: number } } | { kind: 'mixed'; value: { whole: number; num: number; den: number } }, boolean]>([
    ['canonical mixed (1 1/2)', { kind: 'mixed', value: { whole: 1, num: 1, den: 2 } }, true],
    ['improper 6/4 (unsimplified)', { kind: 'improper', value: { num: 6, den: 4 } }, true],
    ['improper 3/2 (simplified)', { kind: 'improper', value: { num: 3, den: 2 } }, true],
    ['mixed 1 2/4 (unsimplified)', { kind: 'mixed', value: { whole: 1, num: 2, den: 4 } }, true],
    ['wrong: 2 1/2', { kind: 'mixed', value: { whole: 2, num: 1, den: 2 } }, false],
    ['wrong: 1/2', { kind: 'improper', value: { num: 1, den: 2 } }, false],
  ])('1/4 × 6 — accepts %s', (_label, user, expected) => {
    expect(mulAnswerAccepted(canonical, user)).toBe(expected);
  });

  it('canonical with whole-only (no fractional remainder)', () => {
    const c = { whole: 3, num: 0, den: 1 }; // e.g. 1 1/2 × 2 = 3
    expect(mulAnswerAccepted(c, { kind: 'mixed', value: { whole: 3, num: 0, den: 1 } })).toBe(true);
    expect(mulAnswerAccepted(c, { kind: 'improper', value: { num: 6, den: 2 } })).toBe(true);
    expect(mulAnswerAccepted(c, { kind: 'improper', value: { num: 3, den: 1 } })).toBe(true);
  });

  it('rejects zero-denominator user input', () => {
    expect(
      mulAnswerAccepted(canonical, { kind: 'improper', value: { num: 1, den: 0 } })
    ).toBe(false);
  });
});

describe('decimalAnswerAccepted', () => {
  it('accepts exact match', () => {
    expect(decimalAnswerAccepted(0.25, 0.25)).toBe(true);
    expect(decimalAnswerAccepted(0.5, 0.5)).toBe(true);
  });

  it('accepts within ±0.001 tolerance', () => {
    expect(decimalAnswerAccepted(0.25, 0.2495)).toBe(true);
    expect(decimalAnswerAccepted(0.25, 0.2505)).toBe(true);
  });

  it('rejects outside tolerance', () => {
    expect(decimalAnswerAccepted(0.25, 0.26)).toBe(false);
    expect(decimalAnswerAccepted(0.25, 0.2)).toBe(false);
  });

  it('rejects NaN / Infinity', () => {
    expect(decimalAnswerAccepted(0.25, NaN)).toBe(false);
    expect(decimalAnswerAccepted(0.25, Infinity)).toBe(false);
  });
});

describe('generateFractionQuestions — mul-by-whole', () => {
  it('all questions are mul-by-whole shaped with whole in [2, 10]', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mul-by-whole'], denominators: [2, 3, 4, 5, 6, 8] }),
      80
    );
    qs.forEach(q => {
      expect(isMulByWholeQuestion(q)).toBe(true);
      if (!isMulByWholeQuestion(q)) return;
      expect(q.whole).toBeGreaterThanOrEqual(2);
      expect(q.whole).toBeLessThanOrEqual(10);
      expect(q.frac.num).toBeGreaterThanOrEqual(1);
      expect(q.frac.num).toBeLessThan(q.frac.den);
    });
  });

  it('answer matches n × w / d in equivalent form', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mul-by-whole'], denominators: [3, 4, 5, 6] }),
      60
    );
    qs.forEach(q => {
      if (!isMulByWholeQuestion(q)) return;
      const rawNum = q.frac.num * q.whole;
      const rawDen = q.frac.den;
      const ansImp = answerToImproper(q.answer);
      expect(ansImp.num * rawDen).toBe(rawNum * ansImp.den);
    });
  });
});

describe('generateFractionQuestions — mixed-mul-whole', () => {
  it('all questions are mixed-mul-whole shaped', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mixed-mul-whole'], denominators: [2, 3, 4, 5] }),
      60
    );
    qs.forEach(q => {
      expect(isMixedMulWholeQuestion(q)).toBe(true);
      if (!isMixedMulWholeQuestion(q)) return;
      expect(q.mixed.whole).toBeGreaterThanOrEqual(1);
      expect(q.mixed.num).toBeGreaterThanOrEqual(1);
      expect(q.mixed.num).toBeLessThan(q.mixed.den);
      expect(q.whole).toBeGreaterThanOrEqual(2);
    });
  });

  it('answer equals (whole*den + num) * w / den', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mixed-mul-whole'], denominators: [3, 4, 5] }),
      40
    );
    qs.forEach(q => {
      if (!isMixedMulWholeQuestion(q)) return;
      const rawNum = (q.mixed.whole * q.mixed.den + q.mixed.num) * q.whole;
      const rawDen = q.mixed.den;
      const ansImp = answerToImproper(q.answer);
      expect(ansImp.num * rawDen).toBe(rawNum * ansImp.den);
    });
  });
});

describe('generateFractionQuestions — mul-frac', () => {
  it('answer = (n1*n2)/(d1*d2) in simplest, proper form', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['mul-frac'], denominators: [2, 3, 4, 5, 6] }),
      80
    );
    qs.forEach(q => {
      expect(isMulFracQuestion(q)).toBe(true);
      if (!isMulFracQuestion(q)) return;
      const rawNum = q.a.num * q.b.num;
      const rawDen = q.a.den * q.b.den;
      expect(q.answer.num * rawDen).toBe(rawNum * q.answer.den);
      expect(fracIsSimplified(q.answer)).toBe(true);
      // kid-friendly: result stays proper
      expect(q.answer.num).toBeGreaterThan(0);
      expect(q.answer.num).toBeLessThan(q.answer.den);
    });
  });
});

describe('generateFractionQuestions — to-decimal', () => {
  it('always yields a common-family fraction with correct decimal', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['to-decimal'], denominators: [2, 4, 5, 10] }),
      40
    );
    const allowedDens = [2, 4, 5, 10];
    qs.forEach(q => {
      expect(isToDecimalQuestion(q)).toBe(true);
      if (!isToDecimalQuestion(q)) return;
      expect(allowedDens).toContain(q.den);
      expect(q.num / q.den).toBeCloseTo(q.answer, 6);
    });
  });

  it('falls back to common-family pool when denom set has no overlap', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['to-decimal'], denominators: [3, 7, 11] }),
      30
    );
    const allowedDens = [2, 4, 5, 10];
    qs.forEach(q => {
      if (!isToDecimalQuestion(q)) return;
      expect(allowedDens).toContain(q.den);
    });
  });
});

describe('generateFractionQuestions — from-decimal', () => {
  it('decimal matches simplified num/den', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['from-decimal'], denominators: [2, 4, 5, 10] }),
      40
    );
    qs.forEach(q => {
      expect(isFromDecimalQuestion(q)).toBe(true);
      if (!isFromDecimalQuestion(q)) return;
      expect(q.num / q.den).toBeCloseTo(q.decimal, 6);
      // Canonical is simplified
      expect(fracIsSimplified({ num: q.num, den: q.den })).toBe(true);
    });
  });
});

describe('generateFractionQuestions — multi-skill mix v3', () => {
  it('mixing all skills emits every skill at least once', () => {
    const qs = generateFractionQuestions(
      baseSettings({
        skills: ALL_SKILLS,
        denominators: [2, 3, 4, 5, 6, 8, 10],
        simplify: true,
      }),
      1600
    );
    const observed = new Set(qs.map(q => q.skill));
    ALL_SKILLS.forEach(s =>
      expect(observed.has(s), `${s} never emitted in 1600 samples`).toBe(true)
    );
  });
});

describe('Y6 — add-mixed / sub-mixed', () => {
  it('add-mixed: answer equals improper(a) + improper(b)', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-mixed'], denominators: [2, 3, 4, 5, 6] }),
      40
    );
    qs.forEach(q => {
      if (!isMixedAddSubQuestion(q)) throw new Error('wrong shape');
      expect(q.skill).toBe('add-mixed');
      const aImp = toImproper(q.a);
      const bImp = toImproper(q.b);
      const expectedNum = aImp.num * bImp.den + bImp.num * aImp.den;
      const expectedDen = aImp.den * bImp.den;
      const ansImp = answerToImproper(q.answer);
      // Cross-multiply equality check.
      expect(ansImp.num * expectedDen).toBe(expectedNum * ansImp.den);
    });
  });

  it('sub-mixed: a >= b and answer = improper(a) - improper(b), non-negative', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['sub-mixed'], denominators: [2, 3, 4, 5, 6] }),
      40
    );
    qs.forEach(q => {
      if (!isMixedAddSubQuestion(q)) throw new Error('wrong shape');
      expect(q.skill).toBe('sub-mixed');
      const aImp = toImproper(q.a);
      const bImp = toImproper(q.b);
      // a >= b via cross-multiplication.
      expect(aImp.num * bImp.den).toBeGreaterThanOrEqual(bImp.num * aImp.den);
      const expectedNum = aImp.num * bImp.den - bImp.num * aImp.den;
      const expectedDen = aImp.den * bImp.den;
      const ansImp = answerToImproper(q.answer);
      expect(ansImp.num * expectedDen).toBe(expectedNum * ansImp.den);
      expect(ansImp.num).toBeGreaterThan(0);
    });
  });

  it('canonical answer is accepted as the user input via mulAnswerAccepted', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['add-mixed', 'sub-mixed'], denominators: [2, 3, 4] }),
      30
    );
    qs.forEach(q => {
      if (!isMixedAddSubQuestion(q)) throw new Error('wrong shape');
      const a = q.answer;
      const mixedInput = {
        kind: 'mixed' as const,
        value: { whole: a.whole ?? 0, num: a.num, den: a.den || 1 },
      };
      expect(mulAnswerAccepted(a, mixedInput)).toBe(true);
    });
  });

  it('CURRICULUM_TAGS for add-mixed and sub-mixed are Y6', () => {
    expect(CURRICULUM_TAGS['add-mixed'].year).toBe('Y6');
    expect(CURRICULUM_TAGS['sub-mixed'].year).toBe('Y6');
  });
});

describe('Y6 — div-frac-whole', () => {
  it('answer is the simplified result of n/d ÷ w = n/(d*w)', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['div-frac-whole'], denominators: [2, 3, 4, 5, 6] }),
      50
    );
    qs.forEach(q => {
      if (!isDivFracWholeQuestion(q)) throw new Error('wrong shape');
      expect(q.skill).toBe('div-frac-whole');
      // Cross-mul: q.frac.num/(q.frac.den * q.whole) === q.answer
      const expectedNum = q.frac.num;
      const expectedDen = q.frac.den * q.whole;
      expect(q.answer.num * expectedDen).toBe(expectedNum * q.answer.den);
      // Result is a proper fraction (per generator).
      expect(q.answer.num).toBeLessThan(q.answer.den);
      // Result is simplified.
      expect(fracIsSimplified(q.answer)).toBe(true);
    });
  });

  it('whole multiplier is 2..6', () => {
    const qs = generateFractionQuestions(
      baseSettings({ skills: ['div-frac-whole'], denominators: [2, 3, 4, 5, 6] }),
      30
    );
    qs.forEach(q => {
      if (!isDivFracWholeQuestion(q)) throw new Error('wrong shape');
      expect(q.whole).toBeGreaterThanOrEqual(2);
      expect(q.whole).toBeLessThanOrEqual(6);
    });
  });

  it('CURRICULUM_TAGS for div-frac-whole is Y6', () => {
    expect(CURRICULUM_TAGS['div-frac-whole'].year).toBe('Y6');
  });
});
