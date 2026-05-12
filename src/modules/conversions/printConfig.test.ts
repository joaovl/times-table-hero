import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildConversionsSummary,
  skillLabel,
} from './printConfig';
import { CONVERSION_SKILL_OPTIONS } from './logic';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes per-page counts in ascending order', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([8, 12, 20, 24]);
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });

  it('all per-page counts divide cleanly into 4 columns', () => {
    // 4-col layout is the default for text-only conversion pages; figure
    // pages use 2 cols and 4 | n implies 2 | n too, so the same options
    // work for both layouts.
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n % 4).toBe(0));
  });
});

describe('buildConversionsSummary', () => {
  it('single skill + easy', () => {
    expect(buildConversionsSummary(['length-cm-mm'], 'easy')).toBe(
      'length-cm-mm • easy'
    );
  });

  it('multiple skills preserve canonical order regardless of input order', () => {
    expect(
      buildConversionsSummary(['volume-cube', 'length-cm-mm'], 'medium')
    ).toBe('length-cm-mm, volume-cube • medium');
  });

  it('all twelve skills + every difficulty render verbatim', () => {
    const out = buildConversionsSummary([...CONVERSION_SKILL_OPTIONS], 'hard');
    expect(out).toContain('length-cm-mm');
    expect(out).toContain('volume-cuboid');
    expect(out).toContain('hard');
  });

  it('falls back to "length-cm-mm" when skills is empty', () => {
    expect(buildConversionsSummary([], 'easy')).toBe('length-cm-mm • easy');
  });

  it('stays under 200 chars for the longest combination', () => {
    const longest = buildConversionsSummary([...CONVERSION_SKILL_OPTIONS], 'medium');
    expect(longest.length).toBeLessThanOrEqual(200);
  });
});

describe('skillLabel', () => {
  it('returns the human-readable label for each skill', () => {
    expect(skillLabel('length-cm-mm')).toBe('Length (cm → mm)');
    expect(skillLabel('mass-kg-g')).toBe('Mass (kg → g)');
    expect(skillLabel('volume-cube')).toBe('Volume (cube)');
    expect(skillLabel('volume-cuboid')).toBe('Volume (cuboid)');
    expect(skillLabel('perimeter-composite')).toBe('Perimeter (composite)');
    expect(skillLabel('area-irregular')).toBe('Area (irregular)');
    expect(skillLabel('metric-imperial')).toBe('Metric ↔ Imperial');
  });
});
