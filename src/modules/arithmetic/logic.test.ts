import { describe, it, expect } from 'vitest';
import { countCarries, countBorrows, generateArithQuestions } from './logic';
import type { ArithSettings, DigitMode } from './logic';

const baseSettings = (over: Partial<ArithSettings>): ArithSettings => ({
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  multiplyLevel: 'd2x1',
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
        baseSettings({ operation: 'add', difficulty: 'easy', digitMode: { kind: 'exact', digits } }),
        40
      );
      qs.forEach(q => {
        expect(countCarries(q.operand1, q.operand2), `digits=${digits}`).toBe(0);
      });
    }
  });

  it('medium 3-digit add: 1 carry (max-1 ceil(3/3))', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBe(1));
  });

  it('medium 5-digit add: 1..2 carries (ceil(5/3) = 2)', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: { kind: 'exact', digits: 5 } }),
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
      baseSettings({ operation: 'add', difficulty: 'hard', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(2));
  });

  it('hard 5-digit add: ≥3 carries (more than ceil(5/3) = 2)', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'hard', digitMode: { kind: 'exact', digits: 5 } }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(3));
  });
});

describe('generateArithQuestions — subtract', () => {
  it('never produces negative answers', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'subtract', difficulty: 'hard', digitMode: { kind: 'exact', digits: 4 } }),
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
      baseSettings({ operation: 'subtract', difficulty: 'easy', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countBorrows(q.operand1, q.operand2)).toBe(0));
  });
});

describe('generateArithQuestions — multiply uses level not difficulty/digits', () => {
  const levels: Array<[ArithSettings['multiplyLevel'], number, number]> = [
    ['facts', 1, 1],
    ['d2x1', 2, 1],
    ['d2x2', 2, 2],
    ['d3x1', 3, 1],
    ['d3x2', 3, 2],
    ['d4x1', 4, 1],
    ['d5x1', 5, 1],
  ];

  it.each(levels)("multiplyLevel '%s' produces operand digits [%i, %i]", (level, expectedD1, expectedD2) => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'multiply', multiplyLevel: level }),
      20
    );
    qs.forEach(q => {
      // operand1 has expectedD1 digits, operand2 has expectedD2 digits.
      // (Generator emits in the order [larger, smaller] when level dictates.)
      expect(digitsOf(q.operand1)).toBe(expectedD1);
      expect(digitsOf(q.operand2)).toBe(expectedD2);
    });
  });

  it('multiplyLevel ignores the digitMode and difficulty settings', () => {
    const qs = generateArithQuestions(
      baseSettings({
        operation: 'multiply',
        multiplyLevel: 'd5x1',
        difficulty: 'easy',
        digitMode: { kind: 'exact', digits: 1 },
      }),
      20
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(5);
      expect(digitsOf(q.operand2)).toBe(1);
    });
  });
});

describe('generateArithQuestions — all', () => {
  it('mixes add, subtract, and multiply', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'all', digitMode: { kind: 'exact', digits: 2 }, difficulty: 'medium' }),
      120
    );
    const ops = new Set(qs.map(q => q.op));
    expect(ops.has('add')).toBe(true);
    expect(ops.has('subtract')).toBe(true);
    expect(ops.has('multiply')).toBe(true);
  });

  it('balances ops evenly when count is divisible by 3', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'all', digitMode: { kind: 'exact', digits: 2 }, difficulty: 'easy' }),
      30
    );
    expect(qs).toHaveLength(30);
    expect(qs.filter(q => q.op === 'add')).toHaveLength(10);
    expect(qs.filter(q => q.op === 'subtract')).toHaveLength(10);
    expect(qs.filter(q => q.op === 'multiply')).toHaveLength(10);
  });

  it('distributes remainder to first ops when count is not divisible', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'all', digitMode: { kind: 'exact', digits: 2 }, difficulty: 'easy' }),
      10
    );
    expect(qs).toHaveLength(10);
    // 10 / 3 = 3 each, remainder 1 → 4, 3, 3
    expect(qs.filter(q => q.op === 'add')).toHaveLength(4);
    expect(qs.filter(q => q.op === 'subtract')).toHaveLength(3);
    expect(qs.filter(q => q.op === 'multiply')).toHaveLength(3);
  });
});

describe('generateArithQuestions — digit mode', () => {
  it('exact: both operands have the requested digit count', () => {
    const dm: DigitMode = { kind: 'exact', digits: 3 };
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: dm }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(3);
      expect(digitsOf(q.operand2)).toBe(3);
    });
  });

  it('upTo: each operand has 1..N digits', () => {
    const dm: DigitMode = { kind: 'upTo', digits: 3 };
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'easy', digitMode: dm }),
      80
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBeGreaterThanOrEqual(1);
      expect(digitsOf(q.operand1)).toBeLessThanOrEqual(3);
      expect(digitsOf(q.operand2)).toBeGreaterThanOrEqual(1);
      expect(digitsOf(q.operand2)).toBeLessThanOrEqual(3);
    });
  });
});
