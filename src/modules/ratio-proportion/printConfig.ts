import type { RatioSkill, Difficulty } from './logic';
import { SKILL_LABELS } from './logic';

export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page options. Most prompts are short ("15% of 80?") so a 3-col layout
// at 20 questions/page fits.
export const PRINT_PER_PAGE_OPTIONS = [12, 20, 30];

function formatSkills(skills: RatioSkill[]): string {
  if (skills.length === 0) return 'no skills';
  if (skills.length === 1) return SKILL_LABELS[skills[0]];
  if (skills.length === 2) return skills.map(s => SKILL_LABELS[s]).join(', ');
  return `${skills.length} skills`;
}

export function buildRatioSummary(skills: RatioSkill[], difficulty: Difficulty): string {
  return `${formatSkills(skills)} • ${difficulty}`;
}
