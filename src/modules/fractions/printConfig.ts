import type { FractionSkill } from './logic';

// Page-count picker options (independent of skill mix).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page options. Fractions need vertical room because each question
// renders stacked numerator-over-denominator notation on both operands.
export const PRINT_PER_PAGE_OPTIONS = [12, 18, 24];

// One-line summary of the active print settings, shown at the top of the
// modal so the parent can see what will be printed.
export function buildFractionsSummary(
  skills: FractionSkill[],
  denominators: number[],
  simplify: boolean
): string {
  const skillPart =
    skills.length === 0
      ? 'no skills'
      : skills.length === 1
        ? skills[0]
        : skills.length <= 3
          ? skills.join(', ')
          : `${skills.length} skills`;

  const denPart = formatDenominators(denominators);
  const simpPart = simplify ? 'simplify' : 'no simplify';

  return `${skillPart} • denominators ${denPart} • ${simpPart}`;
}

// Render denominators set compactly:
//   [4]            → "4"
//   [2,3,4]        → "2-4"          (contiguous range)
//   [2,4,6]        → "2, 4, 6"      (sparse)
function formatDenominators(set: number[]): string {
  if (!set || set.length === 0) return '?';
  const sorted = [...set].sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]}`;
  const isContiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous) return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  return sorted.join(', ');
}
