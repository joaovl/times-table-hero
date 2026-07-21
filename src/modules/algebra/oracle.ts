import type { OracleData } from '@/lib/e2e/oracle';
import { answerText, type AlgebraQuestion } from './logic';

export function algebraOracle(q: AlgebraQuestion, options: string[]): OracleData {
  const expected = answerText(q);
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
