import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildRatioSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('is a sorted ascending list of positive ints', () => {
    expect(PRINT_PER_PAGE_OPTIONS.length).toBeGreaterThanOrEqual(2);
    expect(PRINT_PER_PAGE_OPTIONS[0]).toBeGreaterThan(0);
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });
});

describe('buildRatioSummary', () => {
  it('single skill renders that skill label and difficulty', () => {
    expect(buildRatioSummary(['percent-of'], 'easy')).toBe('Percent of amount • easy');
  });

  it('two skills are joined with comma', () => {
    expect(buildRatioSummary(['percent-of', 'scale-factor'], 'medium')).toBe(
      'Percent of amount, Scale factor • medium'
    );
  });

  it('three or more skills collapse to "N skills"', () => {
    expect(
      buildRatioSummary(['percent-of', 'scale-factor', 'ratio-share'], 'hard')
    ).toBe('3 skills • hard');
  });

  it('empty skill list reads "no skills"', () => {
    expect(buildRatioSummary([], 'easy')).toBe('no skills • easy');
  });

  it('summary stays compact across full skill set', () => {
    const s = buildRatioSummary(
      ['percent-of', 'scale-factor', 'ratio-share', 'ratio-simplify', 'ratio-equivalent'],
      'hard'
    );
    expect(s.length).toBeLessThanOrEqual(40);
  });
});
