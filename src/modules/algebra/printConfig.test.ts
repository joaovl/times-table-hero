import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildAlgebraSummary,
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

describe('buildAlgebraSummary', () => {
  it('single skill -> label + difficulty', () => {
    expect(buildAlgebraSummary(['missing-number'], 'easy')).toBe('Missing number • easy');
  });

  it('two skills -> comma-joined', () => {
    expect(buildAlgebraSummary(['missing-number', 'sequence-next'], 'medium')).toBe(
      'Missing number, Next in sequence • medium'
    );
  });

  it('three+ skills -> "N skills"', () => {
    expect(
      buildAlgebraSummary(
        ['missing-number', 'sequence-next', 'sequence-rule', 'formula-eval'],
        'hard'
      )
    ).toBe('4 skills • hard');
  });

  it('empty -> "no skills"', () => {
    expect(buildAlgebraSummary([], 'easy')).toBe('no skills • easy');
  });

  it('full-set summary stays compact', () => {
    const s = buildAlgebraSummary(
      ['formula-eval', 'missing-number', 'sequence-next', 'sequence-rule', 'expression-evaluate'],
      'hard'
    );
    expect(s.length).toBeLessThanOrEqual(40);
  });
});
