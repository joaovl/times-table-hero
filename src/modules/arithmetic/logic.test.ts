import { describe, it, expect } from 'vitest';
import {
  countCarries,
  countBorrows,
  generateArithQuestions,
  checkArithAnswer,
  divideUsesRemainderField,
} from './logic';
import type { ArithQuestion, ArithSettings } from './logic';

const baseSettings = (over: Partial<ArithSettings>): ArithSettings => ({
  operation: 'add',
  difficulty: 'easy',
  addSubFirstDigits: [2],
  addSubSecondDigits: [2],
  multiplyFirstDigits: [2],
  multiplySecondDigits: [1],
  divideFirstDigits: [2],
  divideSecondDigits: [1],
  allowRemainders: true,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

const digitsOf = (n: number) => (n === 0 ? 1 : Math.floor(Math.log10(n)) + 1);

describe('countCarries', () => {
  it.each([
    [123, 456, 0],
    [19, 1, 1],
    [99, 1, 2],
    [999, 1, 3],
    [12345, 67890, 3],
  ])('countCarries(%i, %i) = %i', (a, b, expected) => {
    expect(countCarries(a, b)).toBe(expected);
  });
});

describe('countBorrows', () => {
  it.each([
    [45, 23, 0],
    [30, 12, 1],
    [300, 12, 2],
    [1000, 1, 3],
    [50000, 1, 4],
  ])('countBorrows(%i, %i) = %i', (a, b, expected) => {
    expect(countBorrows(a, b)).toBe(expected);
  });
});

describe('generateArithQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateArithQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });
});

describe('generateArithQuestions — add difficulty scales with digit count', () => {
  it('easy add: always 0 carries (every digit setting)', () => {
    for (const digits of [2, 3, 4, 5]) {
      const qs = generateArithQuestions(
        baseSettings({
          operation: 'add',
          difficulty: 'easy',
          addSubFirstDigits: [digits],
          addSubSecondDigits: [digits],
        }),
        40
      );
      qs.forEach(q => {
        expect(countCarries(q.operand1, q.operand2), `digits=${digits}`).toBe(0);
      });
    }
  });

  it('medium 3-digit add: 1 carry (max-1 ceil(3/3))', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'medium',
        addSubFirstDigits: [3],
        addSubSecondDigits: [3],
      }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBe(1));
  });

  it('medium 5-digit add: 1..2 carries (ceil(5/3) = 2)', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'medium',
        addSubFirstDigits: [5],
        addSubSecondDigits: [5],
      }),
      40
    );
    qs.forEach(q => {
      const c = countCarries(q.operand1, q.operand2);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(2);
    });
  });

  it('hard 3-digit add: ≥2 carries', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'hard',
        addSubFirstDigits: [3],
        addSubSecondDigits: [3],
      }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(2));
  });

  it('hard 5-digit add: ≥3 carries (more than ceil(5/3) = 2)', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'hard',
        addSubFirstDigits: [5],
        addSubSecondDigits: [5],
      }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(3));
  });
});

describe('generateArithQuestions — subtract', () => {
  it('never produces negative answers', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'subtract',
        difficulty: 'hard',
        addSubFirstDigits: [4],
        addSubSecondDigits: [4],
      }),
      80
    );
    qs.forEach(q => {
      expect(q.op).toBe('subtract');
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.operand1).toBeGreaterThanOrEqual(q.operand2);
    });
  });

  it('easy subtract: 0 borrows', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'subtract',
        difficulty: 'easy',
        addSubFirstDigits: [3],
        addSubSecondDigits: [3],
      }),
      40
    );
    qs.forEach(q => expect(countBorrows(q.operand1, q.operand2)).toBe(0));
  });
});

describe('generateArithQuestions — multiply uses two independent digit pickers', () => {
  // Cover every (firstDigits, secondDigits) combination from 1..5 × 1..5.
  const combos: Array<[number, number]> = [];
  for (let f = 1; f <= 5; f++) for (let s = 1; s <= 5; s++) combos.push([f, s]);

  it.each(combos)('first=[%i], second=[%i]: operand1 has F digits, operand2 has S digits', (f, s) => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'multiply',
        multiplyFirstDigits: [f],
        multiplySecondDigits: [s],
      }),
      20
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(f);
      expect(digitsOf(q.operand2)).toBe(s);
    });
  });

  it('multiply ignores difficulty and add/subtract digit sets', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'multiply',
        multiplyFirstDigits: [5],
        multiplySecondDigits: [1],
        difficulty: 'easy',
        addSubFirstDigits: [1],
        addSubSecondDigits: [1],
      }),
      20
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(5);
      expect(digitsOf(q.operand2)).toBe(1);
    });
  });

  it('multi-select multiply: every operand digit count is in the selected set', () => {
    const firstSet = [2, 3];
    const secondSet = [1, 4];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'multiply',
        multiplyFirstDigits: firstSet,
        multiplySecondDigits: secondSet,
      }),
      80
    );
    qs.forEach(q => {
      expect(firstSet).toContain(digitsOf(q.operand1));
      expect(secondSet).toContain(digitsOf(q.operand2));
    });
  });

  it('multi-select multiply: a wide set ([1..5]) actually emits multiple distinct digit counts', () => {
    const firstSet = [1, 2, 3, 4, 5];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'multiply',
        multiplyFirstDigits: firstSet,
        multiplySecondDigits: [1],
      }),
      300
    );
    const observed = new Set(qs.map(q => digitsOf(q.operand1)));
    expect(observed.size).toBeGreaterThan(1);
    observed.forEach(d => expect(firstSet).toContain(d));
  });
});

describe('generateArithQuestions — divide', () => {
  it('without remainders: exact division (operand1 === operand2 * answer, no remainder field)', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: false,
        divideFirstDigits: [3],
        divideSecondDigits: [1],
      }),
      40
    );
    qs.forEach(q => {
      expect(q.op).toBe('divide');
      expect(q.operand1).toBe(q.operand2 * q.answer);
      // No remainder when allowRemainders is false (or remainder is zero).
      expect(q.remainder === undefined || q.remainder === 0).toBe(true);
    });
  });

  it('with remainders: operand1 === operand2 * answer + remainder, 0 ≤ remainder < divisor', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: true,
        divideFirstDigits: [3],
        divideSecondDigits: [1],
      }),
      80
    );
    qs.forEach(q => {
      expect(q.op).toBe('divide');
      const r = q.remainder ?? 0;
      expect(q.operand1).toBe(q.operand2 * q.answer + r);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(q.operand2);
    });
  });

  it('honours digit-set pairs: 3-digit ÷ 1-digit', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: false,
        divideFirstDigits: [3],
        divideSecondDigits: [1],
      }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(3);
      expect(digitsOf(q.operand2)).toBe(1);
    });
  });

  it('honours digit-set pairs: 4-digit ÷ 2-digit with remainders', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: true,
        divideFirstDigits: [4],
        divideSecondDigits: [2],
      }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(4);
      expect(digitsOf(q.operand2)).toBe(2);
    });
  });

  it('multi-select divide: every operand digit count is in its selected set', () => {
    const firstSet = [3, 4];
    const secondSet = [1, 2];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: false,
        divideFirstDigits: firstSet,
        divideSecondDigits: secondSet,
      }),
      120
    );
    qs.forEach(q => {
      expect(firstSet).toContain(digitsOf(q.operand1));
      expect(secondSet).toContain(digitsOf(q.operand2));
      // Still exact.
      expect(q.operand1).toBe(q.operand2 * q.answer);
    });
  });

  it('divisor is never zero', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'divide',
        allowRemainders: true,
        divideFirstDigits: [1],
        divideSecondDigits: [1],
      }),
      40
    );
    qs.forEach(q => expect(q.operand2).toBeGreaterThan(0));
  });
});

describe('generateArithQuestions — all', () => {
  it('mixes add, subtract, multiply, and divide', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'all',
        addSubFirstDigits: [2],
        addSubSecondDigits: [2],
        difficulty: 'medium',
      }),
      120
    );
    const ops = new Set(qs.map(q => q.op));
    expect(ops.has('add')).toBe(true);
    expect(ops.has('subtract')).toBe(true);
    expect(ops.has('multiply')).toBe(true);
    expect(ops.has('divide')).toBe(true);
  });

  it('balances ops evenly when count is divisible by 4', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'all',
        addSubFirstDigits: [2],
        addSubSecondDigits: [2],
        difficulty: 'easy',
      }),
      40
    );
    expect(qs).toHaveLength(40);
    expect(qs.filter(q => q.op === 'add')).toHaveLength(10);
    expect(qs.filter(q => q.op === 'subtract')).toHaveLength(10);
    expect(qs.filter(q => q.op === 'multiply')).toHaveLength(10);
    expect(qs.filter(q => q.op === 'divide')).toHaveLength(10);
  });

  it('distributes remainder to first ops when count is not divisible by 4', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'all',
        addSubFirstDigits: [2],
        addSubSecondDigits: [2],
        difficulty: 'easy',
      }),
      10
    );
    expect(qs).toHaveLength(10);
    // 10 / 4 = 2 each, remainder 2 → 3, 3, 2, 2
    expect(qs.filter(q => q.op === 'add')).toHaveLength(3);
    expect(qs.filter(q => q.op === 'subtract')).toHaveLength(3);
    expect(qs.filter(q => q.op === 'multiply')).toHaveLength(2);
    expect(qs.filter(q => q.op === 'divide')).toHaveLength(2);
  });
});

describe('generateArithQuestions — add/subtract digit sets', () => {
  it('single-element set: both operands have the requested digit count', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'medium',
        addSubFirstDigits: [3],
        addSubSecondDigits: [3],
      }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(3);
      expect(digitsOf(q.operand2)).toBe(3);
    });
  });

  it('contiguous range [1,2,3]: every operand has 1, 2, or 3 digits', () => {
    const set = [1, 2, 3];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'easy',
        addSubFirstDigits: set,
        addSubSecondDigits: set,
      }),
      120
    );
    qs.forEach(q => {
      expect(set).toContain(digitsOf(q.operand1));
      expect(set).toContain(digitsOf(q.operand2));
    });
  });

  it('sparse set [1,3,5]: every operand has exactly 1, 3, or 5 digits — never 2 or 4', () => {
    const set = [1, 3, 5];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'add',
        difficulty: 'easy',
        addSubFirstDigits: set,
        addSubSecondDigits: set,
      }),
      200
    );
    qs.forEach(q => {
      expect(set).toContain(digitsOf(q.operand1));
      expect(set).toContain(digitsOf(q.operand2));
    });
  });

  it('independent picks: operand1 in firstSet, operand2 in secondSet (subtract may swap)', () => {
    const firstSet = [4, 5];
    const secondSet = [1, 2];
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'subtract',
        difficulty: 'easy',
        addSubFirstDigits: firstSet,
        addSubSecondDigits: secondSet,
      }),
      40
    );
    // For subtract with first ≫ second the swap is rare; but in any case the
    // observed digit-count for each operand must come from the union of both
    // sets, and never from outside it.
    const allowed = [...firstSet, ...secondSet];
    qs.forEach(q => {
      expect(allowed).toContain(digitsOf(q.operand1));
      expect(allowed).toContain(digitsOf(q.operand2));
    });
  });
});

describe('divideUsesRemainderField', () => {
  it('true only for divide questions with a non-zero remainder', () => {
    const exact: ArithQuestion = { op: 'divide', operand1: 24, operand2: 6, answer: 4 };
    const remZero: ArithQuestion = { op: 'divide', operand1: 24, operand2: 6, answer: 4, remainder: 0 };
    const remNonZero: ArithQuestion = { op: 'divide', operand1: 25, operand2: 6, answer: 4, remainder: 1 };
    expect(divideUsesRemainderField(exact)).toBe(false);
    expect(divideUsesRemainderField(remZero)).toBe(false);
    expect(divideUsesRemainderField(remNonZero)).toBe(true);
  });

  it('always false for non-divide ops (even if remainder is accidentally set)', () => {
    const add: ArithQuestion = { op: 'add', operand1: 1, operand2: 2, answer: 3 };
    const mul: ArithQuestion = { op: 'multiply', operand1: 4, operand2: 5, answer: 20 };
    expect(divideUsesRemainderField(add)).toBe(false);
    expect(divideUsesRemainderField(mul)).toBe(false);
  });
});

describe('checkArithAnswer', () => {
  describe('non-divide ops ignore the remainder input', () => {
    const add: ArithQuestion = { op: 'add', operand1: 17, operand2: 8, answer: 25 };

    it('matches when quotient input equals the answer', () => {
      expect(checkArithAnswer(add, 25, null)).toBe(true);
      expect(checkArithAnswer(add, 25, 99)).toBe(true);
    });

    it('rejects when quotient input is wrong, regardless of remainder', () => {
      expect(checkArithAnswer(add, 24, null)).toBe(false);
      expect(checkArithAnswer(add, null, 0)).toBe(false);
    });
  });

  describe('exact divide (no remainder field)', () => {
    const q: ArithQuestion = { op: 'divide', operand1: 24, operand2: 6, answer: 4 };

    it('accepts the right quotient with no remainder typed', () => {
      expect(checkArithAnswer(q, 4, null)).toBe(true);
    });

    it('rejects the wrong quotient', () => {
      expect(checkArithAnswer(q, 5, null)).toBe(false);
    });

    it('ignores remainder input entirely (no remainder field shown for exact divisions)', () => {
      // A stray remainder typed for an exact division still passes — the
      // remainder field would not have been rendered in the first place.
      expect(checkArithAnswer(q, 4, 7)).toBe(true);
    });
  });

  describe('divide with remainder', () => {
    const q: ArithQuestion = { op: 'divide', operand1: 25, operand2: 6, answer: 4, remainder: 1 };

    it('accepts when both quotient and remainder match', () => {
      expect(checkArithAnswer(q, 4, 1)).toBe(true);
    });

    it('rejects when only the quotient matches', () => {
      expect(checkArithAnswer(q, 4, 0)).toBe(false);
      expect(checkArithAnswer(q, 4, 2)).toBe(false);
      expect(checkArithAnswer(q, 4, null)).toBe(false);
    });

    it('rejects when only the remainder matches', () => {
      expect(checkArithAnswer(q, 3, 1)).toBe(false);
      expect(checkArithAnswer(q, null, 1)).toBe(false);
    });

    it('rejects when both are wrong', () => {
      expect(checkArithAnswer(q, 5, 0)).toBe(false);
      expect(checkArithAnswer(q, null, null)).toBe(false);
    });
  });

  describe('divide question with remainder=0 (defensive — should round-trip through the single-input path)', () => {
    // Generators omit remainder when it's 0, so this shape shouldn't appear in
    // practice. But if it does, the answer-check should still behave like an
    // exact division (no remainder field, only quotient checked).
    const q: ArithQuestion = { op: 'divide', operand1: 24, operand2: 6, answer: 4, remainder: 0 };

    it('passes with correct quotient and no remainder typed', () => {
      expect(checkArithAnswer(q, 4, null)).toBe(true);
    });
  });
});
