import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  perPageOptionsForOp,
  buildArithSummary,
  formatDigitSet,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('perPageOptionsForOp', () => {
  it('add allows up to 40 questions per page', () => {
    expect(perPageOptionsForOp('add')).toEqual([10, 20, 30, 40]);
  });

  it('subtract allows up to 40 questions per page', () => {
    expect(perPageOptionsForOp('subtract')).toEqual([10, 20, 30, 40]);
  });

  it('multiply caps at 20 (kid needs vertical room for partial products)', () => {
    expect(perPageOptionsForOp('multiply')).toEqual([5, 10, 15, 20]);
  });

  it("'all' caps at 20 because the mix can include multiply", () => {
    expect(perPageOptionsForOp('all')).toEqual([5, 10, 15, 20]);
  });

  it('every option list is sorted ascending and starts with the smallest non-zero count', () => {
    for (const op of ['add', 'subtract', 'multiply', 'all'] as const) {
      const opts = perPageOptionsForOp(op);
      expect(opts.length).toBeGreaterThanOrEqual(3);
      expect(opts[0]).toBeGreaterThan(0);
      for (let i = 1; i < opts.length; i++) {
        expect(opts[i]).toBeGreaterThan(opts[i - 1]);
      }
    }
  });

  it('multiply max is strictly less than add max (multiply needs more space)', () => {
    const addOpts = perPageOptionsForOp('add');
    const mulOpts = perPageOptionsForOp('multiply');
    expect(mulOpts[mulOpts.length - 1]).toBeLessThan(addOpts[addOpts.length - 1]);
  });
});

describe('formatDigitSet', () => {
  it('single element renders as "N-digit"', () => {
    expect(formatDigitSet([3])).toBe('3-digit');
  });

  it('contiguous range renders with a hyphen', () => {
    expect(formatDigitSet([1, 2, 3])).toBe('1-3 digit');
    expect(formatDigitSet([2, 3, 4, 5])).toBe('2-5 digit');
  });

  it('full range [1..5] renders as "1-5 digit"', () => {
    expect(formatDigitSet([1, 2, 3, 4, 5])).toBe('1-5 digit');
  });

  it('sparse set lists each digit with a comma', () => {
    expect(formatDigitSet([1, 3, 5])).toBe('1, 3, 5 digit');
    expect(formatDigitSet([2, 4])).toBe('2, 4 digit');
  });

  it('sorts unsorted input before formatting', () => {
    expect(formatDigitSet([3, 1, 2])).toBe('1-3 digit');
    expect(formatDigitSet([5, 1, 3])).toBe('1, 3, 5 digit');
  });
});

describe('buildArithSummary', () => {
  it('shows operation, digit-set summary, and difficulty for add', () => {
    expect(
      buildArithSummary('add', 'medium', [3], [1], [2], [1])
    ).toBe('+ • 3-digit + 1-digit • medium');
  });

  it('uses range phrasing when add/subtract digit set is contiguous', () => {
    expect(
      buildArithSummary('subtract', 'easy', [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [2], [1])
    ).toBe('− • 1-5 digit + 1-5 digit • easy');
  });

  it('multiply summary shows only operation + digit pair', () => {
    expect(
      buildArithSummary('multiply', 'easy', [2], [2], [5], [1])
    ).toBe('× • multiply 5-digit × 1-digit');
  });

  it('multiply with 5x5 reflects the parent\'s exact pick', () => {
    expect(
      buildArithSummary('multiply', 'easy', [2], [2], [5], [5])
    ).toBe('× • multiply 5-digit × 5-digit');
  });

  it("'all' summary shows op mix, add/sub digits, difficulty, and multiply pair", () => {
    expect(
      buildArithSummary('all', 'hard', [2], [2], [2], [2])
    ).toBe('All (+ − ×) • 2-digit + 2-digit • hard • multiply 2-digit × 2-digit');
  });

  it('summary stays compact (≤ 80 chars even for the longest case)', () => {
    const longest = buildArithSummary(
      'all',
      'medium',
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5]
    );
    expect(longest.length).toBeLessThanOrEqual(80);
  });
});
