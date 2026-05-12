import type { ConversionSkill, ConversionDifficulty } from './logic';
import { CONVERSION_SKILL_LABEL, CONVERSION_SKILL_OPTIONS } from './logic';

// Page-count picker options (independent of skill).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page counts. Simple conversions are 4-col so 20/24 fit; figure-based
// skills are 2-col so we offer the same totals but the renderer auto-picks
// the right column count based on the per-cell skill mix. Keeping 12/20/24
// here gives a clean 4×3, 4×5, 4×6 grid.
export const PRINT_PER_PAGE_OPTIONS = [8, 12, 20, 24];

/**
 * Compact summary line for the print modal & setup. Mirrors the shapes
 * module so the look-and-feel stays consistent.
 */
export function buildConversionsSummary(
  skills: ConversionSkill[],
  difficulty: ConversionDifficulty
): string {
  const order = new Map<ConversionSkill, number>(
    CONVERSION_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const sorted = [...skills].sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
  );
  const skillPart = sorted.length === 0 ? 'length-cm-mm' : sorted.join(', ');
  return `${skillPart} • ${difficulty}`;
}

/** Long-form label for a skill (used in setup chips). */
export function skillLabel(skill: ConversionSkill): string {
  return CONVERSION_SKILL_LABEL[skill];
}
