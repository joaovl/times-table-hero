import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  perPageOptionsForOp,
  buildArithSummary,
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

describe('buildArithSummary', () => {
  it('shows operation, exact-digit count, and difficulty', () => {
    expect(
      buildArithSummary('add', { kind: 'exact', digits: 3 }, 'medium')
    ).toBe('+ • exactly 3-digit • medium');
  });

  it("uses 'up to N-digit' phrasing when DigitMode.kind is 'upTo'", () => {
    expect(
      buildArithSummary('subtract', { kind: 'upTo', digits: 5 }, 'easy')
    ).toBe('− • up to 5-digit • easy');
  });

  it("'all' op shows the operator mix in the summary", () => {
    expect(
      buildArithSummary('all', { kind: 'exact', digits: 2 }, 'hard')
    ).toBe('All (+ − ×) • exactly 2-digit • hard');
  });

  it('summary string is short enough to fit a typical modal width (≤ 60 chars)', () => {
    const longest = buildArithSummary('all', { kind: 'upTo', digits: 5 }, 'medium');
    expect(longest.length).toBeLessThanOrEqual(60);
  });
});
