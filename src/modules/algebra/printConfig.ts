import type { AlgebraSkill, Difficulty } from './logic';
import { SKILL_LABELS } from './logic';

export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];
export const PRINT_PER_PAGE_OPTIONS = [10, 16, 24];

function formatSkills(skills: AlgebraSkill[]): string {
  if (skills.length === 0) return 'no skills';
  if (skills.length === 1) return SKILL_LABELS[skills[0]];
  if (skills.length === 2) return skills.map(s => SKILL_LABELS[s]).join(', ');
  return `${skills.length} skills`;
}

export function buildAlgebraSummary(skills: AlgebraSkill[], difficulty: Difficulty): string {
  return `${formatSkills(skills)} • ${difficulty}`;
}
