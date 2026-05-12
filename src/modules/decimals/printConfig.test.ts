import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildDecimalsSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('is sorted ascending and all values positive', () => {
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
  });

  it('caps at 32 (4 cols × 8 rows) for short-skill packing', () => {
    expect(PRINT_PER_PAGE_OPTIONS[PRINT_PER_PAGE_OPTIONS.length - 1]).toBe(32);
  });
});

describe('buildDecimalsSummary', () => {
  it('single skill renders its label', () => {
    expect(buildDecimalsSummary(['identify-tenths'])).toBe('Tenths (Y4)');
  });

  it('two skills render comma-joined labels', () => {
    expect(buildDecimalsSummary(['identify-tenths', 'round-1dp'])).toBe(
      'Tenths (Y4), Round 1dp (Y4)'
    );
  });

  it('four or more skills collapses to a count', () => {
    expect(
      buildDecimalsSummary([
        'identify-tenths',
        'identify-hundredths',
        'round-1dp',
        'compare-decimals',
      ])
    ).toBe('4 skills');
  });

  it('empty skills returns "no skills"', () => {
    expect(buildDecimalsSummary([])).toBe('no skills');
  });
});
