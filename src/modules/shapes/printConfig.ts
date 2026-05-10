import type { ShapeSkill, ShapeUnits, ShapeDifficulty } from './logic';
import { SHAPE_SKILL_LABEL, SHAPE_SKILL_OPTIONS } from './logic';

// Page-count picker options (independent of skill).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Shapes need horizontal room for labels — keep per-page counts low so
// each cell can fit a labelled figure plus a short prompt and answer line.
export const PRINT_PER_PAGE_OPTIONS = [9, 12, 18];

/** Compact summary line for the print modal & setup. */
export function buildShapesSummary(
  skills: ShapeSkill[],
  units: ShapeUnits,
  difficulty: ShapeDifficulty
): string {
  const order = new Map<ShapeSkill, number>(SHAPE_SKILL_OPTIONS.map((s, i) => [s, i]));
  const sorted = [...skills].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  // Keep the summary short — show the skill ids (cmnt: they're already
  // short, e.g. "name-2d"), units, then difficulty.
  const skillPart = sorted.length === 0 ? 'name-2d' : sorted.join(', ');
  return `${skillPart} • ${units} • ${difficulty}`;
}

/** Long-form label for a skill (used in setup chips). */
export function skillLabel(skill: ShapeSkill): string {
  return SHAPE_SKILL_LABEL[skill];
}
