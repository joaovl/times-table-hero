import type { PlayableModule } from '../moduleContract';
import { algebraSettings } from '../settings';
import {
  ALL_SKILLS,
  generateAlgebraQuestions,
  checkAlgebraAnswer,
  answerText,
  generateChoices,
  type AlgebraQuestion,
  type AlgebraSettings,
} from '@/modules/algebra/logic';

export const algebraModule: PlayableModule<AlgebraSettings, AlgebraQuestion> = {
  slug: 'algebra',
  skills: [...ALL_SKILLS],
  settingsFor: algebraSettings,
  generate: (s, n) => generateAlgebraQuestions(s, n),
  correctAnswer: (q) => answerText(q),
  isCorrect: (q, a) => checkAlgebraAnswer(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
