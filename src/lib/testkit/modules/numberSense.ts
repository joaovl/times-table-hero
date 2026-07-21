import type { PlayableModule } from '../moduleContract';
import { numberSenseSettings } from '../settings';
import {
  ALL_SKILLS,
  generateNumberSenseQuestions,
  checkNumberSenseAnswer,
  generateChoices,
  answerText,
  type NumberSenseQuestion,
  type NumberSenseSettings,
} from '@/modules/number-sense/logic';

export const numberSenseModule: PlayableModule<NumberSenseSettings, NumberSenseQuestion> = {
  slug: 'number-sense',
  skills: [...ALL_SKILLS],
  settingsFor: numberSenseSettings,
  generate: (s, n) => generateNumberSenseQuestions(s, n),
  correctAnswer: (q) => answerText(q),
  isCorrect: (q, a) => checkNumberSenseAnswer(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
