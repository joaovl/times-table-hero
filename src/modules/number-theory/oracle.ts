import type { OracleData } from '@/lib/e2e/oracle';
import type { NumberTheoryQuestion } from './logic';

// number-theory answers are typed lists/values or yes/no buttons; the canonical
// string is discriminated by the runtime type of q.answer.
export function numberTheoryOracle(q: NumberTheoryQuestion): OracleData {
  const ans = q.answer as boolean | number | number[];
  const expected =
    typeof ans === 'boolean' ? (ans ? 'yes' : 'no') : Array.isArray(ans) ? ans.join(', ') : String(ans);
  return { questionId: JSON.stringify(q), expected, inputMode: 'typed', highlightCount: 0 };
}
