import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS_LONG,
  perPageOptionsForSkills,
  buildNumberSenseSummary,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('default set runs from 10 up to 30', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([10, 20, 30]);
  });

  it('long-prompt set is smaller (sequences need vertical room)', () => {
    expect(PRINT_PER_PAGE_OPTIONS_LONG).toEqual([8, 12, 16]);
  });

  it('long-prompt max is strictly less than default max', () => {
    expect(PRINT_PER_PAGE_OPTIONS_LONG[PRINT_PER_PAGE_OPTIONS_LONG.length - 1]).toBeLessThan(
      PRINT_PER_PAGE_OPTIONS[PRINT_PER_PAGE_OPTIONS.length - 1]
    );
  });

  it('every option list is sorted ascending and starts positive', () => {
    for (const list of [PRINT_PER_PAGE_OPTIONS, PRINT_PER_PAGE_OPTIONS_LONG]) {
      expect(list.length).toBeGreaterThanOrEqual(3);
      expect(list[0]).toBeGreaterThan(0);
      for (let i = 1; i < list.length; i++) {
        expect(list[i]).toBeGreaterThan(list[i - 1]);
      }
    }
  });
});

describe('perPageOptionsForSkills', () => {
  it('short-prompt skills get the default per-page options', () => {
    expect(perPageOptionsForSkills(['place-value-3d'])).toEqual(PRINT_PER_PAGE_OPTIONS);
    expect(perPageOptionsForSkills(['round-100'])).toEqual(PRINT_PER_PAGE_OPTIONS);
    expect(perPageOptionsForSkills(['roman-100'])).toEqual(PRINT_PER_PAGE_OPTIONS);
    expect(perPageOptionsForSkills(['place-value-3d', 'round-1000', 'roman-100'])).toEqual(
      PRINT_PER_PAGE_OPTIONS
    );
  });

  it('order-numbers falls back to the long-prompt set', () => {
    expect(perPageOptionsForSkills(['order-numbers'])).toEqual(PRINT_PER_PAGE_OPTIONS_LONG);
  });

  it('count-multiples falls back to the long-prompt set', () => {
    expect(perPageOptionsForSkills(['count-multiples'])).toEqual(PRINT_PER_PAGE_OPTIONS_LONG);
  });

  it('negative-count falls back to the long-prompt set', () => {
    expect(perPageOptionsForSkills(['negative-count'])).toEqual(PRINT_PER_PAGE_OPTIONS_LONG);
  });

  it('a mix that contains any long-prompt skill uses the long-prompt set', () => {
    expect(perPageOptionsForSkills(['place-value-3d', 'order-numbers'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LONG
    );
    expect(perPageOptionsForSkills(['round-10', 'count-multiples'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LONG
    );
  });
});

describe('buildNumberSenseSummary', () => {
  it('single skill renders that skill label and difficulty', () => {
    expect(buildNumberSenseSummary(['place-value-3d'], 'easy')).toBe(
      'Place value (3-digit) • easy'
    );
  });

  it('two skills are joined with comma', () => {
    expect(buildNumberSenseSummary(['round-10', 'round-100'], 'medium')).toBe(
      'Round to 10, Round to 100 • medium'
    );
  });

  it('three or more skills collapse to "N skills"', () => {
    expect(
      buildNumberSenseSummary(['place-value-3d', 'round-10', 'roman-100'], 'hard')
    ).toBe('3 skills • hard');
    expect(
      buildNumberSenseSummary(
        ['place-value-3d', 'place-value-4d', 'round-10', 'round-100', 'roman-100'],
        'medium'
      )
    ).toBe('5 skills • medium');
  });

  it('empty skill list reads "no skills"', () => {
    expect(buildNumberSenseSummary([], 'easy')).toBe('no skills • easy');
  });

  it('summary stays compact', () => {
    const summary = buildNumberSenseSummary(
      [
        'place-value-3d',
        'place-value-4d',
        'place-value-7d',
        'round-10',
        'round-100',
        'round-1000',
        'round-10k',
        'count-multiples',
        'negative-count',
        'roman-100',
        'roman-1000',
        'order-numbers',
      ],
      'hard'
    );
    expect(summary.length).toBeLessThanOrEqual(40);
  });
});
