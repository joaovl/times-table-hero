import type { Difficulty, MoneySkill } from './logic';
import { MONEY_SKILL_LABEL } from './logic';

// Page-count picker options (matches arithmetic).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page question counts. Skills come in two shapes:
//   - "binary" skills (add, subtract, multiply, change, compare) are
//     one-line questions, so they fit in a 4-column grid: up to 24 per page.
//   - "multi-item" needs a multi-line list per question, so a 2-column grid
//     caps at 10 per page.
// When the user mixes skills (the common case), we use the tighter cap so
// every page composes cleanly.
export const PRINT_PAGE_OPTIONS_BINARY = [8, 12, 16, 20, 24];
export const PRINT_PAGE_OPTIONS_MULTI = [4, 6, 8, 10];

export function perPageOptionsForSkills(skills: ReadonlyArray<MoneySkill>): number[] {
  return skills.includes('multi-item') ? PRINT_PAGE_OPTIONS_MULTI : PRINT_PAGE_OPTIONS_BINARY;
}

// Compact label for a skill set. Empty → "?".
export function formatSkillSet(skills: ReadonlyArray<MoneySkill>): string {
  if (!skills || skills.length === 0) return '?';
  if (skills.length === 1) return MONEY_SKILL_LABEL[skills[0]];
  return skills.map(s => MONEY_SKILL_LABEL[s]).join(' + ');
}

// One-line summary of the active print settings.
export function buildMoneySummary(
  skills: ReadonlyArray<MoneySkill>,
  difficulty: Difficulty
): string {
  return `${formatSkillSet(skills)} • ${difficulty}`;
}
