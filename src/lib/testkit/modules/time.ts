import type { PlayableModule } from '../moduleContract';
import { timeSettings } from '../settings';
import {
  TIME_SKILL_OPTIONS,
  generateTimeQuestions,
  isAnswerCorrect,
  expectedAnswerString,
  generateChoices,
  type TimeQuestion,
  type TimeSettings,
} from '@/modules/time/logic';

export const timeModule: PlayableModule<TimeSettings, TimeQuestion> = {
  slug: 'time',
  skills: [...TIME_SKILL_OPTIONS],
  settingsFor: timeSettings,
  generate: (s, n) => generateTimeQuestions(s, n),
  correctAnswer: (q) => expectedAnswerString(q),
  isCorrect: (q, a) => isAnswerCorrect(q, a),
  // Every time answer is a string (HH:MM, "2h 15m", roman), so generateChoices
  // returns [] and the module uses typed input throughout.
  choices: (q) => generateChoices(q, 'easy'),
};
