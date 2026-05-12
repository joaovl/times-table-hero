import type { DecimalsSkill } from './logic';
import { SKILL_LABELS } from './logic';

// Page-count picker options.
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page options. Decimals questions are short single-line items
// (typically 4-col grid) so we can pack more than fractions.
export const PRINT_PER_PAGE_OPTIONS = [16, 24, 32];

// One-line summary of the active print settings, shown at the top of the
// print modal so the parent can verify what will be printed.
export function buildDecimalsSummary(skills: DecimalsSkill[]): string {
  if (skills.length === 0) return 'no skills';
  if (skills.length === 1) return SKILL_LABELS[skills[0]];
  if (skills.length <= 3) return skills.map(s => SKILL_LABELS[s]).join(', ');
  return `${skills.length} skills`;
}
