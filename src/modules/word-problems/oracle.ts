import type { OracleData } from '@/lib/e2e/oracle';
import { expectedAnswerString, type WordQuestion } from './logic';

export function wordProblemsOracle(q: WordQuestion, options: string[]): OracleData {
  const expected = expectedAnswerString(q);
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
