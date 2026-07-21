import type { PlayableModule } from '../moduleContract';
import { decimalsSettings } from '../settings';
import { parseAnswer } from '@/lib/i18n/number';
import {
  ALL_SKILLS,
  generateDecimalsQuestions,
  checkNumericAnswer,
  checkFractionAnswer,
  checkOrderAnswer,
  parseDecimalList,
  isIdentifyQuestion,
  isRoundQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isPercentQuestion,
  type DecimalsQuestion,
  type DecimalsSettings,
} from '@/modules/decimals/logic';

// Decimals dispatches to different graders per question kind (see
// DecimalsPlay). Each branch below mirrors that Play component exactly.

function parseFrac(a: string): [number | null, number | null] {
  const m = a.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return [null, null];
  return [parseAnswer(m[1]), parseAnswer(m[2])];
}

function correctAnswer(q: DecimalsQuestion): string {
  if (isIdentifyQuestion(q)) return `${q.answerNum}/${q.answerDen}`;
  if (isRoundQuestion(q)) return String(q.answer);
  if (isCompareQuestion(q)) return q.answer.join(', ');
  if (isFractionDecimalQuestion(q)) {
    return q.skill === 'fraction-to-decimal' ? String(q.decimal) : `${q.num}/${q.den}`;
  }
  if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') return `${q.num}/${q.den}`;
    if (q.skill === 'percent-decimal') return String(q.decimal);
    return String(q.percent); // decimal-percent
  }
  return String(q.answer); // add / subtract
}

function isCorrect(q: DecimalsQuestion, a: string): boolean {
  if (isIdentifyQuestion(q)) {
    const [n, d] = parseFrac(a);
    return checkFractionAnswer(q.answerNum, q.answerDen, n, d);
  }
  if (isRoundQuestion(q)) return checkNumericAnswer(q.answer, parseAnswer(a));
  if (isCompareQuestion(q)) {
    const parsed = parseDecimalList(a);
    return parsed !== null && checkOrderAnswer(q.answer, parsed);
  }
  if (isFractionDecimalQuestion(q)) {
    if (q.skill === 'fraction-to-decimal') return checkNumericAnswer(q.decimal, parseAnswer(a));
    const [n, d] = parseFrac(a);
    return checkFractionAnswer(q.num, q.den, n, d);
  }
  if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') {
      const [n, d] = parseFrac(a);
      return checkFractionAnswer(q.num, q.den, n, d);
    }
    if (q.skill === 'percent-decimal') return checkNumericAnswer(q.decimal, parseAnswer(a));
    // decimal-percent: strip a trailing %, as DecimalsPlay.submitPercentAsPercent does.
    return checkNumericAnswer(q.percent, parseAnswer(a.replace(/%/g, '').trim()));
  }
  return checkNumericAnswer(q.answer, parseAnswer(a)); // add / subtract
}

export const decimalsModule: PlayableModule<DecimalsSettings, DecimalsQuestion> = {
  slug: 'decimals',
  skills: [...ALL_SKILLS],
  settingsFor: decimalsSettings,
  generate: (s, n) => generateDecimalsQuestions(s, n),
  correctAnswer,
  isCorrect,
  choices: () => [], // decimals uses typed / two-field / pick input, no MC
};
