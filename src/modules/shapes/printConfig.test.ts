import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildShapesSummary,
  skillLabel,
} from './printConfig';
import { SHAPE_SKILL_OPTIONS, SHAPE_UNIT_OPTIONS } from './logic';

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20 page counts', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes 9, 12, 18 questions per page (3-col grid)', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([9, 12, 18]);
  });

  it('values are ascending and all positive', () => {
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n).toBeGreaterThan(0));
    for (let i = 1; i < PRINT_PER_PAGE_OPTIONS.length; i++) {
      expect(PRINT_PER_PAGE_OPTIONS[i]).toBeGreaterThan(PRINT_PER_PAGE_OPTIONS[i - 1]);
    }
  });

  it('all per-page counts divide cleanly into 3 columns', () => {
    PRINT_PER_PAGE_OPTIONS.forEach(n => expect(n % 3).toBe(0));
  });
});

describe('buildShapesSummary', () => {
  it('single skill + cm + easy', () => {
    expect(buildShapesSummary(['name-2d'], 'cm', 'easy')).toBe('name-2d • cm • easy');
  });

  it('multiple skills preserve canonical order regardless of input order', () => {
    expect(buildShapesSummary(['area-rect', 'name-2d'], 'cm', 'easy'))
      .toBe('name-2d, area-rect • cm • easy');
    expect(buildShapesSummary(['perimeter-rect', 'name-2d', 'count-sides'], 'm', 'medium'))
      .toBe('name-2d, count-sides, perimeter-rect • m • medium');
  });

  it('all four skills + every unit option', () => {
    SHAPE_UNIT_OPTIONS.forEach(u => {
      const out = buildShapesSummary([...SHAPE_SKILL_OPTIONS], u, 'hard');
      expect(out).toBe(
        `name-2d, count-sides, perimeter-rect, area-rect • ${u} • hard`
      );
    });
  });

  it('falls back to "name-2d" when skills is empty', () => {
    expect(buildShapesSummary([], 'cm', 'easy')).toBe('name-2d • cm • easy');
  });

  it('every difficulty renders verbatim', () => {
    expect(buildShapesSummary(['name-2d'], 'cm', 'easy')).toContain('easy');
    expect(buildShapesSummary(['name-2d'], 'cm', 'medium')).toContain('medium');
    expect(buildShapesSummary(['name-2d'], 'cm', 'hard')).toContain('hard');
  });

  it('stays compact (≤ 80 chars for the longest combination)', () => {
    const longest = buildShapesSummary([...SHAPE_SKILL_OPTIONS], 'mm', 'medium');
    expect(longest.length).toBeLessThanOrEqual(80);
  });
});

describe('skillLabel', () => {
  it('returns the human-readable label for each skill', () => {
    expect(skillLabel('name-2d')).toBe('Name (2D)');
    expect(skillLabel('count-sides')).toBe('Count sides');
    expect(skillLabel('perimeter-rect')).toBe('Perimeter (rect)');
    expect(skillLabel('area-rect')).toBe('Area (rect)');
  });
});
