import type { PlayableModule } from '../moduleContract';
import { ratioSettings } from '../settings';
import {
  ALL_SKILLS,
  generateRatioQuestions,
  checkRatioAnswer,
  answerText,
  generateRatioChoices,
  type RatioQuestion,
  type RatioSettings,
} from '@/modules/ratio-proportion/logic';

export const ratioProportionModule: PlayableModule<RatioSettings, RatioQuestion> = {
  slug: 'ratio-proportion',
  skills: [...ALL_SKILLS],
  settingsFor: ratioSettings,
  generate: (s, n) => generateRatioQuestions(s, n),
  correctAnswer: (q) => answerText(q),
  isCorrect: (q, a) => checkRatioAnswer(q, a),
  choices: (q) => generateRatioChoices(q, 'easy'),
};
