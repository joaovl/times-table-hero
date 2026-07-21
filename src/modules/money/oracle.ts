import type { OracleData } from '@/lib/e2e/oracle';
import { formatMoney, type MoneyQuestion, type ComparePricesQuestion } from './logic';

// Most money skills take a typed amount (formatMoney round-trips through
// parseMoney); compare-prices is an A / Equal / B button choice.
export function moneyOracle(q: MoneyQuestion): OracleData {
  const expected =
    q.skill === 'compare-prices' ? (q as ComparePricesQuestion).answer : formatMoney(q.answerPence);
  return { questionId: JSON.stringify(q), expected, inputMode: 'typed', highlightCount: 0 };
}
