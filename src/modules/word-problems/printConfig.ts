import type { WordDifficulty, WordProblemSkill } from './logic';
import { WORD_SKILL_OPTIONS, WORD_SKILL_SHORT } from './logic';

// Page-count picker options (independent of skill set).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Word problems are long. 4-6 per page comfortably; we also offer 8 for
// shorter "easy" prompts.
export const PRINT_PER_PAGE_OPTIONS = [4, 6, 8];

const DIFFICULTY_LABEL: Record<WordDifficulty, string> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

/**
 * Compact summary for the print modal. Lists active skills in canonical
 * order, then the difficulty.
 */
export function buildWordSummary(
  skills: WordProblemSkill[],
  difficulty: WordDifficulty
): string {
  const orderIndex = new Map<WordProblemSkill, number>(
    WORD_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const sorted = [...skills].sort(
    (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
  );
  const skillLabels =
    sorted.length === 0
      ? [WORD_SKILL_SHORT['arith-1step']]
      : sorted.map(s => WORD_SKILL_SHORT[s]);
  return `${skillLabels.join(', ')} - ${DIFFICULTY_LABEL[difficulty]}`;
}
