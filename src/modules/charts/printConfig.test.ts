import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildChartsSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes 4, 6, 8, 10 questions per page (charts need real estate)', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([4, 6, 8, 10]);
  });

  it('values are ascending and all positive', () => {
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });

  it('caps at 10 (any higher and charts become unreadable)', () => {
    expect(Math.max(...PRINT_PER_PAGE_OPTIONS)).toBe(10);
  });
});

describe('buildChartsSummary', () => {
  it('single skill', () => {
    expect(buildChartsSummary(['read-bar'], 50, 5)).toBe('read-bar • up to 50 • 5 categories');
  });

  it('two skills preserve canonical order regardless of input order', () => {
    expect(buildChartsSummary(['total-bar', 'read-bar'], 100, 6))
      .toBe('read-bar, total-bar • up to 100 • 6 categories');
  });

  it('three skills', () => {
    expect(buildChartsSummary(['read-bar', 'compare-bar', 'total-bar'], 1000, 7))
      .toBe('read-bar, compare-bar, total-bar • up to 1000 • 7 categories');
  });

  it('reorders compare-bar and total-bar regardless of input order', () => {
    expect(buildChartsSummary(['total-bar', 'compare-bar'], 10, 4))
      .toBe('compare-bar, total-bar • up to 10 • 4 categories');
  });

  it('falls back to "read-bar" label when skills is empty', () => {
    expect(buildChartsSummary([], 50, 5)).toBe('read-bar • up to 50 • 5 categories');
  });

  it('stays compact (≤ 80 chars even for the longest combination)', () => {
    const longest = buildChartsSummary(
      ['read-bar', 'compare-bar', 'total-bar'],
      1000,
      7,
    );
    expect(longest.length).toBeLessThanOrEqual(80);
  });

  it('covers every maxValue chip', () => {
    [10, 50, 100, 1000].forEach(v => {
      const s = buildChartsSummary(['read-bar'], v, 5);
      expect(s).toContain(`up to ${v}`);
    });
  });

  it('covers every numCategories chip', () => {
    [4, 5, 6, 7].forEach(n => {
      const s = buildChartsSummary(['read-bar'], 50, n);
      expect(s).toContain(`${n} categories`);
    });
  });
});
