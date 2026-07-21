import type { OracleData } from '@/lib/e2e/oracle';
import type { Question } from './logic';

// Test-only ground truth for the current times-tables question. `options` are
// the multiple-choice buttons shown ([] when the child types the answer).
export function timesTablesOracle(q: Question, options: string[]): OracleData {
  const expected = String(q.answer);
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
