import type { PlayableModule } from '../moduleContract';
import { numberTheorySettings } from '../settings';
import {
  NUMBER_THEORY_SKILL_OPTIONS,
  generateNumberTheoryQuestions,
  isAnswerCorrect,
  type NumberTheoryQuestion,
  type NumberTheorySettings,
} from '@/modules/number-theory/logic';

// Three answer shapes, discriminated by the runtime type of q.answer:
//   boolean -> yes/no skills (factor-pair, is-multiple, prime-recognize)
//   number[] -> list skills (factors, multiples, common-factor, prime-list-19)
//   number   -> value skills (square, cube, square-root)
function correctAnswer(q: NumberTheoryQuestion): string {
  const ans = q.answer as boolean | number | number[];
  if (typeof ans === 'boolean') return ans ? 'yes' : 'no';
  if (Array.isArray(ans)) return ans.join(', ');
  return String(ans);
}

function isCorrect(q: NumberTheoryQuestion, a: string): boolean {
  if (typeof q.answer === 'boolean') {
    const s = a.trim().toLowerCase();
    const bool =
      s === 'yes' || s === 'true' || s === '1'
        ? true
        : s === 'no' || s === 'false' || s === '0'
          ? false
          : null;
    return isAnswerCorrect(q, '', bool);
  }
  return isAnswerCorrect(q, a, null);
}

export const numberTheoryModule: PlayableModule<NumberTheorySettings, NumberTheoryQuestion> = {
  slug: 'number-theory',
  skills: [...NUMBER_THEORY_SKILL_OPTIONS],
  settingsFor: numberTheorySettings,
  generate: (s, n) => generateNumberTheoryQuestions(s, n),
  correctAnswer,
  isCorrect,
  choices: () => [], // typed lists / yes-no buttons / typed values; no numeric MC
};
