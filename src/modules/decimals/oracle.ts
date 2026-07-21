import type { OracleData } from '@/lib/e2e/oracle';
import {
  isIdentifyQuestion,
  isRoundQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isPercentQuestion,
  type DecimalsQuestion,
} from './logic';

// Canonical answer per decimals question kind (mirrors DecimalsPlay). The
// widget varies: single numeric field, two-field fraction "n/d", or (for
// compare-decimals) tapping the decimals in ascending order — the e2e answerer
// splits a comma-separated `expected` and taps each value's button in turn.
export function decimalsOracle(q: DecimalsQuestion): OracleData {
  let expected: string;
  if (isIdentifyQuestion(q)) expected = `${q.answerNum}/${q.answerDen}`;
  else if (isRoundQuestion(q)) expected = String(q.answer);
  else if (isCompareQuestion(q)) expected = q.answer.join(', ');
  else if (isFractionDecimalQuestion(q)) {
    expected = q.skill === 'fraction-to-decimal' ? String(q.decimal) : `${q.num}/${q.den}`;
  } else if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') expected = `${q.num}/${q.den}`;
    else if (q.skill === 'percent-decimal') expected = String(q.decimal);
    else expected = String(q.percent);
  } else {
    expected = String(q.answer); // add / subtract
  }
  return { questionId: JSON.stringify(q), expected, inputMode: 'typed', highlightCount: 0 };
}
