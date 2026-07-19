import { describe, it, expect } from 'vitest';
import { MODULE_ACCENT, moduleAccent } from './moduleAccent';

const HUB_SLUGS = [
  'times-tables', 'arithmetic', 'time', 'fractions', 'shapes', 'charts',
  'number-sense', 'money', 'decimals', 'number-theory', 'conversions',
  'word-problems', 'ratio-proportion', 'algebra', 'statistics',
];

describe('moduleAccent', () => {
  it('covers every hub module with a distinct solid color', () => {
    const colors = new Set<string>();
    for (const slug of HUB_SLUGS) {
      const a = MODULE_ACCENT[slug];
      expect(a, slug).toBeDefined();
      expect(a.color).toMatch(/^hsl\(/);
      expect(a.soft).toContain('/ 0.14');
      colors.add(a.color);
    }
    expect(colors.size).toBe(HUB_SLUGS.length); // no two modules share a color
  });

  it('falls back to the hero accent for unknown slugs', () => {
    expect(moduleAccent('nope').color).toBe(MODULE_ACCENT['times-tables'].color);
  });
});
