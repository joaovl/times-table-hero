import type { OracleData } from '@/lib/e2e/oracle';
import { expectedAnswerString, type TimeQuestion } from './logic';

// Time answers are always typed strings (HH:MM, "2h 15m", roman), so there are
// no multiple-choice buttons.
export function timeOracle(q: TimeQuestion): OracleData {
  const expected = expectedAnswerString(q);
  return {
    questionId: JSON.stringify(q),
    expected,
    inputMode: 'typed',
    highlightCount: 0,
  };
}
