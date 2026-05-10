import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildFractionsSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('caps lower than arithmetic because fractions need vertical room', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([12, 18, 24]);
  });

  it('is sorted ascending and all values positive', () => {
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
  });

  it('max per page is 24 (3 cols × 8 rows)', () => {
    expect(PRINT_PER_PAGE_OPTIONS[PRINT_PER_PAGE_OPTIONS.length - 1]).toBe(24);
  });
});

describe('buildFractionsSummary', () => {
  it('single skill, contiguous denom range, simplify on', () => {
    expect(buildFractionsSummary(['add-same'], [2, 3, 4], true)).toBe(
      'add-same • denominators 2-4 • simplify'
    );
  });

  it('single skill, single denom', () => {
    expect(buildFractionsSummary(['sub-same'], [5], true)).toBe(
      'sub-same • denominators 5 • simplify'
    );
  });

  it('multiple skills (≤ 3) lists each by name', () => {
    expect(buildFractionsSummary(['add-same', 'sub-same'], [3, 4, 5], true)).toBe(
      'add-same, sub-same • denominators 3-5 • simplify'
    );
  });

  it('all four skills collapses to a count', () => {
    expect(
      buildFractionsSummary(['add-same', 'sub-same', 'add-diff', 'sub-diff'], [2, 3, 4], true)
    ).toBe('4 skills • denominators 2-4 • simplify');
  });

  it('sparse denominator set lists each value with commas', () => {
    expect(buildFractionsSummary(['add-same'], [2, 4, 6, 8], true)).toBe(
      'add-same • denominators 2, 4, 6, 8 • simplify'
    );
  });

  it('simplify off appears in summary', () => {
    expect(buildFractionsSummary(['add-same'], [2, 3], false)).toBe(
      'add-same • denominators 2-3 • no simplify'
    );
  });

  it('diff skills produce a readable summary', () => {
    expect(buildFractionsSummary(['add-diff', 'sub-diff'], [2, 3, 4, 5], true)).toBe(
      'add-diff, sub-diff • denominators 2-5 • simplify'
    );
  });

  it('summary stays compact (≤ 80 chars for typical cases)', () => {
    const longest = buildFractionsSummary(
      ['add-same', 'sub-same', 'add-diff', 'sub-diff'],
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      true
    );
    expect(longest.length).toBeLessThanOrEqual(80);
  });
});
