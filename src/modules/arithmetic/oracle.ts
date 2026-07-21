import type { OracleData } from '@/lib/e2e/oracle';
import { divideUsesRemainderField, type ArithQuestion } from './logic';

// Test-only ground truth for the current arithmetic question. `options` are the
// multiple-choice buttons shown ([] for typed input, incl. remainder division).
export function arithmeticOracle(q: ArithQuestion, options: string[]): OracleData {
  const expected = divideUsesRemainderField(q)
    ? `${q.answer} r ${q.remainder ?? 0}`
    : String(q.answer);
  const inputMode: 'choices' | 'typed' = options.length > 0 ? 'choices' : 'typed';
  return {
    questionId: JSON.stringify(q),
    expected,
    inputMode,
    choices: inputMode === 'choices' ? options : undefined,
    correctChoice: inputMode === 'choices' ? expected : undefined,
    highlightCount: 0,
  };
}
