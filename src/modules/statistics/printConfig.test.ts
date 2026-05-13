import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildStatsSummary,
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

describe('buildStatsSummary', () => {
  it('single skill -> label + difficulty', () => {
    expect(buildStatsSummary(['mean-calc'], 'easy')).toBe('Mean • easy');
  });

  it('two skills -> comma-joined', () => {
    expect(buildStatsSummary(['mean-calc', 'median'], 'medium')).toBe(
      'Mean, Median • medium'
    );
  });

  it('three+ skills -> "N skills"', () => {
    expect(buildStatsSummary(['mean-calc', 'median', 'mode'], 'hard')).toBe('3 skills • hard');
  });

  it('empty -> "no skills"', () => {
    expect(buildStatsSummary([], 'easy')).toBe('no skills • easy');
  });

  it('full-set summary stays compact', () => {
    const s = buildStatsSummary(
      ['mean-calc', 'mean-find-missing', 'median', 'mode', 'range'],
      'hard'
    );
    expect(s.length).toBeLessThanOrEqual(40);
  });
});
