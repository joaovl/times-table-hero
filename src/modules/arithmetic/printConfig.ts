import type { ArithOp, DigitMode, Difficulty } from './logic';

// Page-count picker options (independent of operation).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page count varies by operation: + and − take a single row each, but
// multiplication needs vertical space for partial products / working below
// the rule. 'all' includes multiply, so it follows the multiply cap.
export function perPageOptionsForOp(op: ArithOp): number[] {
  if (op === 'add' || op === 'subtract') return [10, 20, 30, 40];
  return [5, 10, 15, 20];
}

// One-line summary of the active print settings, shown at the top of the
// modal so the parent can see what will be printed.
export function buildArithSummary(
  operation: ArithOp,
  digitMode: DigitMode,
  difficulty: Difficulty
): string {
  const opPart: Record<ArithOp, string> = {
    add: '+',
    subtract: '−',
    multiply: '×',
    all: 'All (+ − ×)',
  };
  const digitsPart =
    digitMode.kind === 'exact'
      ? `exactly ${digitMode.digits}-digit`
      : `up to ${digitMode.digits}-digit`;
  return `${opPart[operation]} • ${digitsPart} • ${difficulty}`;
}
