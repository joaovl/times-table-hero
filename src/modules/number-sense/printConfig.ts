import type { NumberSenseSkill, Difficulty } from './logic';
import { SKILL_LABELS } from './logic';

// Page-count picker options (independent of skill mix).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page options. Number sense questions are mostly single-line prompts
// in a 4-col grid; order-numbers and sequence skills get longer rows so
// caps stay conservative.
export const PRINT_PER_PAGE_OPTIONS = [10, 20, 30];

// Per-page options for the "long-prompt" layout (order-numbers / sequences
// dominant). 2-col layout fits fewer questions.
export const PRINT_PER_PAGE_OPTIONS_LONG = [8, 12, 16];

// Pick the per-page option set based on the skill mix. Anything with
// order-numbers or sequence skills falls back to the long-prompt set.
export function perPageOptionsForSkills(skills: NumberSenseSkill[]): number[] {
  const hasLong = skills.some(
    s =>
      s === 'order-numbers' ||
      s === 'count-multiples' ||
      s === 'negative-count' ||
      s === 'negative-interval' ||
      s === 'bidmas'
  );
  return hasLong ? PRINT_PER_PAGE_OPTIONS_LONG : PRINT_PER_PAGE_OPTIONS;
}

// Render the skill list compactly so the modal subtitle doesn't overflow.
//   []         → "no skills"
//   [s]        → SKILL_LABELS[s]
//   [s,t]      → "<label1>, <label2>"
//   ≥ 3 items  → "N skills"
function formatSkills(skills: NumberSenseSkill[]): string {
  if (skills.length === 0) return 'no skills';
  if (skills.length === 1) return SKILL_LABELS[skills[0]];
  if (skills.length === 2) return skills.map(s => SKILL_LABELS[s]).join(', ');
  return `${skills.length} skills`;
}

// One-line summary of the active print settings, shown at the top of the
// modal and the worksheet header so the parent sees exactly what will print.
export function buildNumberSenseSummary(
  skills: NumberSenseSkill[],
  difficulty: Difficulty
): string {
  return `${formatSkills(skills)} • ${difficulty}`;
}
