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

  it('all skills + every unit option (skills preserved in canonical order)', () => {
    SHAPE_UNIT_OPTIONS.forEach(u => {
      const out = buildShapesSummary([...SHAPE_SKILL_OPTIONS], u, 'hard');
      // The v1 prefix must come first; the v3 suffix follows in canonical
      // order. We assert the substrings rather than the full string so
      // future additions to SHAPE_SKILL_OPTIONS won't break this test.
      expect(out.startsWith('name-2d, count-sides, perimeter-rect, area-rect, area-tri, area-circle, circumference, angle-name')).toBe(true);
      expect(out).toContain('name-3d');
      expect(out).toContain('translation');
      expect(out).toContain(` • ${u} • hard`);
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

  it('stays reasonably compact for the longest combination', () => {
    // v3 adds 10 more skills and v4 adds 4 Y6 skills, so the threshold has
    // grown again. Still fits within the print-modal layout.
    const longest = buildShapesSummary([...SHAPE_SKILL_OPTIONS], 'mm', 'medium');
    expect(longest.length).toBeLessThanOrEqual(360);
  });
});

describe('skillLabel', () => {
  it('returns the human-readable label for each v1 skill', () => {
    expect(skillLabel('name-2d')).toBe('Name (2D)');
    expect(skillLabel('count-sides')).toBe('Count sides');
    expect(skillLabel('perimeter-rect')).toBe('Perimeter (rect)');
    expect(skillLabel('area-rect')).toBe('Area (rect)');
    expect(skillLabel('area-tri')).toBe('Area (triangle)');
    expect(skillLabel('area-circle')).toBe('Area (circle)');
    expect(skillLabel('circumference')).toBe('Circumference');
    expect(skillLabel('angle-name')).toBe('Name angle');
  });

  it('returns labels for each v3 (Y5) skill', () => {
    expect(skillLabel('name-3d')).toBe('Name (3D)');
    expect(skillLabel('count-faces')).toBe('Count faces');
    expect(skillLabel('count-edges')).toBe('Count edges');
    expect(skillLabel('count-vertices')).toBe('Count vertices');
    expect(skillLabel('angle-measure')).toBe('Measure angle');
    expect(skillLabel('angle-name-reflex')).toBe('Name angle (+reflex)');
    expect(skillLabel('lines-of-symmetry')).toBe('Lines of symmetry');
    expect(skillLabel('coord-read')).toBe('Read coordinates');
    expect(skillLabel('coord-plot')).toBe('Plot coordinates');
    expect(skillLabel('translation')).toBe('Translate point');
  });
});
