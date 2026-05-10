import { describe, it, expect } from 'vitest';
import { countCarries, countBorrows, generateArithQuestions } from './logic';
import type { ArithSettings, DigitMode } from './logic';

const baseSettings = (over: Partial<ArithSettings>): ArithSettings => ({
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
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

describe('generateArithQuestions — add difficulty buckets', () => {
  it('easy add: 0 carries', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'easy', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => {
      expect(q.op).toBe('add');
      expect(countCarries(q.operand1, q.operand2)).toBe(0);
    });
  });

  it('medium add: exactly 1 carry', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBe(1));
  });

  it('hard add: ≥2 carries', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'hard', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(2));
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

describe('generateArithQuestions — multiply digit cap', () => {
  it('5-digit setting still caps multiplication operands at 3 digits max', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'multiply', difficulty: 'hard', digitMode: { kind: 'exact', digits: 5 } }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBeLessThanOrEqual(3);
      expect(digitsOf(q.operand2)).toBeLessThanOrEqual(3);
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
