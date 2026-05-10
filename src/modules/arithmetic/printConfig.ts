import type { ArithOp, Difficulty } from './logic';

// Page-count picker options (independent of operation).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page count varies by operation: + and − take a single row each, but
// multiplication needs vertical space for partial products / working below
// the rule. Division needs similar vertical room for long-division working.
// 'all' includes multiply and divide, so it follows the tighter cap.
export function perPageOptionsForOp(op: ArithOp): number[] {
  if (op === 'add' || op === 'subtract') return [10, 20, 30, 40];
  return [5, 10, 15, 20];
}

// Render a non-empty digit-set as a compact label.
//   [3]        → "3-digit"
//   [1,2,3]    → "1-3 digit"          (contiguous range)
//   [1,3,5]    → "1, 3, 5 digit"      (sparse)
export function formatDigitSet(set: number[]): string {
  if (!set || set.length === 0) return '?-digit';
  const sorted = [...set].sort((a, b) => a - b);
  if (sorted.length === 1) return `${sorted[0]}-digit`;
  const isContiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isContiguous) return `${sorted[0]}-${sorted[sorted.length - 1]} digit`;
  return `${sorted.join(', ')} digit`;
}

// One-line summary of the active print settings, shown at the top of the
// modal so the parent can see what will be printed. Includes the multiply
// and divide digit pairs when relevant.
export function buildArithSummary(
  operation: ArithOp,
  difficulty: Difficulty,
  addSubFirst: number[],
  addSubSecond: number[],
  multiplyFirst: number[],
  multiplySecond: number[],
  divideFirst: number[] = [2],
  divideSecond: number[] = [1],
  allowRemainders: boolean = true
): string {
  const opPart: Record<ArithOp, string> = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷',
    all: 'All (+ − × ÷)',
  };
  const parts: string[] = [opPart[operation]];
  if (operation === 'add' || operation === 'subtract' || operation === 'all') {
    parts.push(`${formatDigitSet(addSubFirst)} + ${formatDigitSet(addSubSecond)}`);
    parts.push(difficulty);
  }
  if (operation === 'multiply' || operation === 'all') {
    parts.push(`multiply ${formatDigitSet(multiplyFirst)} × ${formatDigitSet(multiplySecond)}`);
  }
  if (operation === 'divide' || operation === 'all') {
    const remainderNote = allowRemainders ? ' (with remainders)' : '';
    parts.push(`divide ${formatDigitSet(divideFirst)} ÷ ${formatDigitSet(divideSecond)}${remainderNote}`);
  }
  return parts.join(' • ');
}
