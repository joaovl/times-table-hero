import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PAGE_OPTIONS_BINARY,
  PRINT_PAGE_OPTIONS_MULTI,
  buildMoneySummary,
  formatSkillSet,
  perPageOptionsForSkills,
} from './printConfig';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts (matches arithmetic)', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('per-page option lists', () => {
  it('binary list is sorted ascending and >= 8', () => {
    expect(PRINT_PAGE_OPTIONS_BINARY[0]).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < PRINT_PAGE_OPTIONS_BINARY.length; i++) {
      expect(PRINT_PAGE_OPTIONS_BINARY[i]).toBeGreaterThan(PRINT_PAGE_OPTIONS_BINARY[i - 1]);
    }
  });

  it('multi list is sorted ascending and ≤ 10 max', () => {
    expect(PRINT_PAGE_OPTIONS_MULTI[PRINT_PAGE_OPTIONS_MULTI.length - 1]).toBeLessThanOrEqual(10);
    for (let i = 1; i < PRINT_PAGE_OPTIONS_MULTI.length; i++) {
      expect(PRINT_PAGE_OPTIONS_MULTI[i]).toBeGreaterThan(PRINT_PAGE_OPTIONS_MULTI[i - 1]);
    }
  });

  it('multi list max < binary list max (multi-item needs more space)', () => {
    const mMax = PRINT_PAGE_OPTIONS_MULTI[PRINT_PAGE_OPTIONS_MULTI.length - 1];
    const bMax = PRINT_PAGE_OPTIONS_BINARY[PRINT_PAGE_OPTIONS_BINARY.length - 1];
    expect(mMax).toBeLessThan(bMax);
  });
});

describe('perPageOptionsForSkills', () => {
  it('binary-only skill sets get the binary option list', () => {
    expect(perPageOptionsForSkills(['add-money'])).toEqual(PRINT_PAGE_OPTIONS_BINARY);
    expect(perPageOptionsForSkills(['subtract-money', 'compare-prices'])).toEqual(
      PRINT_PAGE_OPTIONS_BINARY
    );
    expect(perPageOptionsForSkills(['multiply-money', 'change'])).toEqual(
      PRINT_PAGE_OPTIONS_BINARY
    );
  });

  it('any set including multi-item drops to the multi option list', () => {
    expect(perPageOptionsForSkills(['multi-item'])).toEqual(PRINT_PAGE_OPTIONS_MULTI);
    expect(perPageOptionsForSkills(['add-money', 'multi-item'])).toEqual(
      PRINT_PAGE_OPTIONS_MULTI
    );
    expect(
      perPageOptionsForSkills(['add-money', 'subtract-money', 'multi-item', 'compare-prices'])
    ).toEqual(PRINT_PAGE_OPTIONS_MULTI);
  });
});

describe('formatSkillSet', () => {
  it('empty set renders as "?"', () => {
    expect(formatSkillSet([])).toBe('?');
  });

  it('single skill renders its label', () => {
    expect(formatSkillSet(['add-money'])).toBe('Add money');
  });

  it('multiple skills join with " + "', () => {
    expect(formatSkillSet(['add-money', 'subtract-money'])).toBe('Add money + Subtract money');
  });
});

describe('buildMoneySummary', () => {
  it('combines skill label with difficulty', () => {
    expect(buildMoneySummary(['add-money'], 'easy')).toBe('Add money • easy');
    expect(buildMoneySummary(['change'], 'medium')).toBe('Give change • medium');
  });

  it('summarises multi-skill setups compactly', () => {
    expect(
      buildMoneySummary(['add-money', 'subtract-money', 'change'], 'hard')
    ).toBe('Add money + Subtract money + Give change • hard');
  });

  it('stays under 130 chars even for the widest possible setup', () => {
    const longest = buildMoneySummary(
      ['add-money', 'subtract-money', 'change', 'multi-item', 'compare-prices', 'multiply-money'],
      'medium'
    );
    expect(longest.length).toBeLessThanOrEqual(130);
  });
});
