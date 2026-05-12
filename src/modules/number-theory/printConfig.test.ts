import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS_LIST,
  PRINT_PER_PAGE_OPTIONS_SINGLE,
  buildNumberTheorySummary,
  perPageOptionsForSkills,
  skillLabel,
} from './printConfig';
import { NUMBER_THEORY_SKILL_OPTIONS } from './logic';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS lists', () => {
  it('SINGLE list is ascending and starts above zero', () => {
    expect(PRINT_PER_PAGE_OPTIONS_SINGLE.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS_SINGLE.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS_SINGLE[i]).toBeGreaterThan(
        PRINT_PER_PAGE_OPTIONS_SINGLE[i - 1]
      );
    }
    expect(PRINT_PER_PAGE_OPTIONS_SINGLE[0]).toBeGreaterThan(0);
  });

  it('LIST list is ascending and strictly smaller cap than SINGLE', () => {
    expect(PRINT_PER_PAGE_OPTIONS_LIST.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS_LIST.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS_LIST[i]).toBeGreaterThan(
        PRINT_PER_PAGE_OPTIONS_LIST[i - 1]
      );
    }
    expect(PRINT_PER_PAGE_OPTIONS_LIST[PRINT_PER_PAGE_OPTIONS_LIST.length - 1])
      .toBeLessThan(
        PRINT_PER_PAGE_OPTIONS_SINGLE[PRINT_PER_PAGE_OPTIONS_SINGLE.length - 1]
      );
  });
});

describe('perPageOptionsForSkills', () => {
  it('returns the SINGLE list when no list-answer skill is selected', () => {
    expect(perPageOptionsForSkills(['square', 'cube'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_SINGLE
    );
    expect(perPageOptionsForSkills(['prime-recognize'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_SINGLE
    );
  });

  it('returns the LIST list as soon as one list-answer skill is selected', () => {
    expect(perPageOptionsForSkills(['factors'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LIST
    );
    expect(perPageOptionsForSkills(['multiples'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LIST
    );
    expect(perPageOptionsForSkills(['common-factor'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LIST
    );
    expect(perPageOptionsForSkills(['prime-list-19'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LIST
    );
  });

  it('a mixed selection that contains any list skill uses the LIST list', () => {
    expect(perPageOptionsForSkills(['square', 'factors'])).toEqual(
      PRINT_PER_PAGE_OPTIONS_LIST
    );
  });
});

describe('skillLabel', () => {
  it('returns the human-readable label for each skill', () => {
    expect(skillLabel('factors')).toBe('Factors');
    expect(skillLabel('factor-pair')).toBe('Factor pair (y/n)');
    expect(skillLabel('multiples')).toBe('Multiples');
    expect(skillLabel('is-multiple')).toBe('Is multiple (y/n)');
    expect(skillLabel('prime-recognize')).toBe('Is prime (y/n)');
    expect(skillLabel('prime-list-19')).toBe('Pick the primes');
    expect(skillLabel('square')).toBe('Square (n²)');
    expect(skillLabel('cube')).toBe('Cube (n³)');
    expect(skillLabel('common-factor')).toBe('Common factors');
    expect(skillLabel('square-root')).toBe('Square root');
  });
});

describe('buildNumberTheorySummary', () => {
  it('single skill + easy', () => {
    expect(buildNumberTheorySummary(['factors'], 'easy')).toBe(
      'factors • easy'
    );
  });

  it('multiple skills preserve canonical order regardless of input order', () => {
    expect(buildNumberTheorySummary(['square', 'factors'], 'medium')).toBe(
      'factors, square • medium'
    );
    expect(
      buildNumberTheorySummary(
        ['cube', 'square', 'factors', 'multiples'],
        'hard'
      )
    ).toBe('factors, multiples, square, cube • hard');
  });

  it('all skills + every difficulty', () => {
    expect(
      buildNumberTheorySummary([...NUMBER_THEORY_SKILL_OPTIONS], 'hard')
    ).toBe(
      `${NUMBER_THEORY_SKILL_OPTIONS.join(', ')} • hard`
    );
  });

  it('falls back to "factors" when skills is empty', () => {
    expect(buildNumberTheorySummary([], 'easy')).toBe('factors • easy');
  });

  it('stays reasonably compact (≤ 160 chars for the longest combination)', () => {
    const longest = buildNumberTheorySummary(
      [...NUMBER_THEORY_SKILL_OPTIONS],
      'medium'
    );
    expect(longest.length).toBeLessThanOrEqual(160);
  });
});
