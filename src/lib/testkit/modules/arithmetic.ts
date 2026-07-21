import type { PlayableModule } from '../moduleContract';
import { arithmeticSettings } from '../settings';
import {
  generateArithQuestions,
  generateArithChoices,
  checkArithAnswer,
  divideUsesRemainderField,
  type ArithQuestion,
  type ArithSettings,
  type ArithOp,
} from '@/modules/arithmetic/logic';

const OPERATIONS: ArithOp[] = ['add', 'subtract', 'multiply', 'divide', 'all'];

// Remainder divisions carry two fields; the canonical string is "Q r R".
function correctAnswer(q: ArithQuestion): string {
  return divideUsesRemainderField(q) ? `${q.answer} r ${q.remainder ?? 0}` : String(q.answer);
}

function isCorrect(q: ArithQuestion, a: string): boolean {
  if (divideUsesRemainderField(q)) {
    const m = a.match(/^\s*(-?\d+)\s*r\s*(-?\d+)\s*$/i);
    if (!m) return false;
    return checkArithAnswer(q, Number(m[1]), Number(m[2]));
  }
  const n = Number(a);
  return Number.isFinite(n) && a.trim() !== '' && checkArithAnswer(q, n, null);
}

export const arithmeticModule: PlayableModule<ArithSettings, ArithQuestion> = {
  slug: 'arithmetic',
  skills: OPERATIONS,
  settingsFor: arithmeticSettings,
  generate: (s, n) => generateArithQuestions(s, n),
  correctAnswer,
  isCorrect,
  choices: (q) => generateArithChoices(q, 'easy'),
};
