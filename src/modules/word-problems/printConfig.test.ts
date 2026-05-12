import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildWordSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes 4, 6, 8 questions per page (prompts are long)', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([4, 6, 8]);
  });

  it('values are ascending and all positive', () => {
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });
});

describe('buildWordSummary', () => {
  it('single skill + difficulty', () => {
    expect(buildWordSummary(['arith-1step'], 'easy')).toBe('Arith 1-step - easy');
  });

  it('multiple skills preserve canonical order regardless of input order', () => {
    expect(buildWordSummary(['money-1step', 'arith-1step'], 'medium')).toBe(
      'Arith 1-step, Money 1-step - medium'
    );
  });

  it('falls back to first skill when none provided', () => {
    expect(buildWordSummary([], 'easy')).toBe('Arith 1-step - easy');
  });

  it('stays compact for the longest combination', () => {
    const all = buildWordSummary(
      [
        'arith-1step',
        'arith-2step',
        'money-1step',
        'money-2step',
        'time-1step',
        'measure-1step',
        'measure-2step',
        'fractions-1step',
      ],
      'hard'
    );
    expect(all.length).toBeLessThanOrEqual(140);
  });
});
