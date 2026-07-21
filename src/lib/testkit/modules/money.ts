import type { PlayableModule } from '../moduleContract';
import { moneySettings } from '../settings';
import {
  MONEY_SKILL_OPTIONS,
  generateMoneyQuestions,
  checkMoneyAnswer,
  checkCompareAnswer,
  formatMoney,
  parseMoney,
  type MoneyQuestion,
  type MoneySettings,
  type ComparePricesQuestion,
} from '@/modules/money/logic';

// Most money skills take a typed amount graded in pence (formatMoney/parseMoney
// round-trip on the default GBP config). compare-prices is A/B/equal buttons.
function correctAnswer(q: MoneyQuestion): string {
  if (q.skill === 'compare-prices') return (q as ComparePricesQuestion).answer;
  return formatMoney(q.answerPence);
}

function isCorrect(q: MoneyQuestion, a: string): boolean {
  if (q.skill === 'compare-prices') {
    return checkCompareAnswer(q as ComparePricesQuestion, a as 'A' | 'B' | 'equal');
  }
  return checkMoneyAnswer(q, parseMoney(a));
}

export const moneyModule: PlayableModule<MoneySettings, MoneyQuestion> = {
  slug: 'money',
  skills: [...MONEY_SKILL_OPTIONS],
  settingsFor: moneySettings,
  generate: (s, n) => generateMoneyQuestions(s, n),
  correctAnswer,
  isCorrect,
  choices: (q) => (q.skill === 'compare-prices' ? ['A', 'B', 'equal'] : []),
};
