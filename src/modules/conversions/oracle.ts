import type { OracleData } from '@/lib/e2e/oracle';
import type { ConversionQuestion } from './logic';

export function conversionsOracle(q: ConversionQuestion, options: string[]): OracleData {
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
