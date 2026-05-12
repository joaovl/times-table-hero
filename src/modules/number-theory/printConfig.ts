import type { NumberTheoryDifficulty, NumberTheorySkill } from './logic';
import {
  LIST_SKILLS,
  NUMBER_THEORY_SKILL_LABEL,
  NUMBER_THEORY_SKILL_OPTIONS,
} from './logic';

// Page-count picker options (independent of skill).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page options depend on whether the selected skill set includes any
// list-answer skills. List answers (factors, multiples, common-factor,
// prime-list-19) need a longer answer line, so the renderer drops to a 2-col
// grid; the single-answer skills use a 4-col grid and can pack more.
export const PRINT_PER_PAGE_OPTIONS_SINGLE = [12, 16, 20, 24];
export const PRINT_PER_PAGE_OPTIONS_LIST = [6, 10, 14, 18];

/** Pick the right per-page option list based on the active skill set. */
export function perPageOptionsForSkills(skills: NumberTheorySkill[]): number[] {
  const hasList = skills.some(s => (LIST_SKILLS as readonly string[]).includes(s));
  return hasList ? PRINT_PER_PAGE_OPTIONS_LIST : PRINT_PER_PAGE_OPTIONS_SINGLE;
}

/** Long-form label for a skill (used in setup chips and summary). */
export function skillLabel(skill: NumberTheorySkill): string {
  return NUMBER_THEORY_SKILL_LABEL[skill];
}

/** Compact summary line for the print modal & setup card. */
export function buildNumberTheorySummary(
  skills: NumberTheorySkill[],
  difficulty: NumberTheoryDifficulty
): string {
  const order = new Map<NumberTheorySkill, number>(
    NUMBER_THEORY_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const sorted = [...skills].sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
  );
  const skillPart = sorted.length === 0 ? 'factors' : sorted.join(', ');
  return `${skillPart} • ${difficulty}`;
}
