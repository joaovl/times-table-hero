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

  it('divide caps at 20 (kid needs vertical room for long-division working)', () => {
    expect(perPageOptionsForOp('divide')).toEqual([5, 10, 15, 20]);
  });

  it("'all' caps at 20 because the mix can include multiply or divide", () => {
    expect(perPageOptionsForOp('all')).toEqual([5, 10, 15, 20]);
  });

  it('every option list is sorted ascending and starts with the smallest non-zero count', () => {
    for (const op of ['add', 'subtract', 'multiply', 'divide', 'all'] as const) {
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
      buildArithSummary('add', 'medium', [3], [1], [2], [1], [2], [1], true)
    ).toBe('+ • 3-digit + 1-digit • medium');
  });

  it('uses range phrasing when add/subtract digit set is contiguous', () => {
    expect(
      buildArithSummary('subtract', 'easy', [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [2], [1], [2], [1], true)
    ).toBe('− • 1-5 digit + 1-5 digit • easy');
  });

  it('multiply summary shows only operation + digit pair', () => {
    expect(
      buildArithSummary('multiply', 'easy', [2], [2], [5], [1], [2], [1], true)
    ).toBe('× • multiply 5-digit × 1-digit');
  });

  it('multiply with 5x5 reflects the parent\'s exact pick', () => {
    expect(
      buildArithSummary('multiply', 'easy', [2], [2], [5], [5], [2], [1], true)
    ).toBe('× • multiply 5-digit × 5-digit');
  });

  it('divide summary with remainders shows the (with remainders) note', () => {
    expect(
      buildArithSummary('divide', 'easy', [2], [2], [2], [1], [3], [1], true)
    ).toBe('÷ • divide 3-digit ÷ 1-digit (with remainders)');
  });

  it('divide summary without remainders omits the note', () => {
    expect(
      buildArithSummary('divide', 'easy', [2], [2], [2], [1], [3], [1], false)
    ).toBe('÷ • divide 3-digit ÷ 1-digit');
  });

  it('divide summary reflects the divisor digit-set picker', () => {
    expect(
      buildArithSummary('divide', 'easy', [2], [2], [2], [1], [4], [2], false)
    ).toBe('÷ • divide 4-digit ÷ 2-digit');
  });

  it("'all' summary shows op mix, add/sub digits, difficulty, multiply pair, and divide pair", () => {
    expect(
      buildArithSummary('all', 'hard', [2], [2], [2], [2], [2], [1], true)
    ).toBe('All (+ − × ÷) • 2-digit + 2-digit • hard • multiply 2-digit × 2-digit • divide 2-digit ÷ 1-digit (with remainders)');
  });

  it("'all' summary respects the no-remainder toggle", () => {
    expect(
      buildArithSummary('all', 'easy', [2], [2], [2], [2], [2], [1], false)
    ).toBe('All (+ − × ÷) • 2-digit + 2-digit • easy • multiply 2-digit × 2-digit • divide 2-digit ÷ 1-digit');
  });

  it('default args (no divide overrides, default remainders) summarise add cleanly', () => {
    expect(buildArithSummary('add', 'easy', [2], [2], [2], [1])).toBe(
      '+ • 2-digit + 2-digit • easy'
    );
  });

  it('summary stays compact (≤ 130 chars even for the longest "all" case with widest ranges)', () => {
    // 'all' with widest possible digit-sets across every operation now adds
    // multiply + divide tails, so the budget needs to be wider than the
    // pre-division 80-char cap. Stay well under one printed line.
    const longest = buildArithSummary(
      'all',
      'medium',
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
      true
    );
    expect(longest.length).toBeLessThanOrEqual(130);
  });
});
