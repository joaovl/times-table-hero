import type { OracleData } from '@/lib/e2e/oracle';
import type { FractionQuestion } from './logic';

// Oracle for op-style fraction questions (add/sub, same/diff denominator).
// The answer is a Frac; a knowing user types it as "num/den" into the
// Numerator/Denominator fields. No visual answer clues exist for these.
export function fractionOpOracle(q: FractionQuestion): OracleData {
  const a = (q as { answer: { num: number; den: number } }).answer;
  return {
    questionId: JSON.stringify(q),
    expected: `${a.num}/${a.den}`,
    inputMode: 'typed',
    highlightCount: 0,
  };
}
