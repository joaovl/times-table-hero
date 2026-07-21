import type { PlayableModule } from '../moduleContract';
import { conversionsSettings } from '../settings';
import {
  CONVERSION_SKILL_OPTIONS,
  generateConversionQuestions,
  isAnswerCorrect,
  generateChoices,
  type ConversionQuestion,
  type ConversionSettings,
} from '@/modules/conversions/logic';

export const conversionsModule: PlayableModule<ConversionSettings, ConversionQuestion> = {
  slug: 'conversions',
  skills: [...CONVERSION_SKILL_OPTIONS],
  settingsFor: conversionsSettings,
  generate: (s, n) => generateConversionQuestions(s, n),
  // answerString(q) is a display string ("~ 12.3 mi"); a knowing player types
  // just the number, which is what isAnswerCorrect parses.
  correctAnswer: (q) => String(q.answer),
  isCorrect: (q, a) => isAnswerCorrect(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
