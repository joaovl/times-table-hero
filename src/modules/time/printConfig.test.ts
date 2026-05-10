import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildTimeSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes 10, 15, 20 questions per page (clocks need real estate)', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([10, 15, 20]);
  });

  it('values are ascending and all positive', () => {
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });
});

describe('buildTimeSummary', () => {
  it('single precision + 12h', () => {
    expect(buildTimeSummary(['hour'], '12h')).toBe('hour • 12h');
  });

  it('multiple precisions preserve canonical order regardless of input order', () => {
    expect(buildTimeSummary(['half', 'hour'], '12h')).toBe('hour, half-hour • 12h');
    expect(buildTimeSummary(['quarter', 'hour', 'half'], '12h'))
      .toBe('hour, half-hour, quarter • 12h');
  });

  it('all precisions + 24h', () => {
    expect(buildTimeSummary(['hour', 'half', 'quarter', '5min', '1min'], '24h'))
      .toBe('hour, half-hour, quarter, 5-min, 1-min • 24h');
  });

  it('both format', () => {
    expect(buildTimeSummary(['quarter'], 'both')).toBe('quarter • 12h + 24h');
  });

  it('1min precision label', () => {
    expect(buildTimeSummary(['1min'], '12h')).toBe('1-min • 12h');
  });

  it('5min precision label', () => {
    expect(buildTimeSummary(['5min'], '24h')).toBe('5-min • 24h');
  });

  it('stays compact (≤ 80 chars even for the longest combination)', () => {
    const longest = buildTimeSummary(['hour', 'half', 'quarter', '5min', '1min'], 'both');
    expect(longest.length).toBeLessThanOrEqual(80);
  });

  it('falls back to "hour" label when precisions is empty', () => {
    expect(buildTimeSummary([], '12h')).toBe('hour • 12h');
  });

  it('prefixes the skill segment when skills are provided', () => {
    expect(buildTimeSummary(['hour'], '12h', ['read'])).toBe(
      'Read clock • hour • 12h'
    );
    expect(buildTimeSummary(['hour'], '12h', ['arith'])).toBe(
      'Time arithmetic • hour • 12h'
    );
  });

  it('joins multiple skills with " + " in canonical order', () => {
    expect(buildTimeSummary(['quarter'], '24h', ['arith', 'read'])).toBe(
      'Read clock + Time arithmetic • quarter • 24h'
    );
  });

  it('omits the skill segment when skills are not provided (backwards-compatible)', () => {
    expect(buildTimeSummary(['hour'], '12h')).toBe('hour • 12h');
  });
});
