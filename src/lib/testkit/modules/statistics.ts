import type { PlayableModule } from '../moduleContract';
import { statisticsSettings } from '../settings';
import {
  ALL_SKILLS,
  generateStatsQuestions,
  checkStatsAnswer,
  answerText,
  generateChoices,
  type StatsQuestion,
  type StatsSettings,
} from '@/modules/statistics/logic';

export const statisticsModule: PlayableModule<StatsSettings, StatsQuestion> = {
  slug: 'statistics',
  skills: [...ALL_SKILLS],
  settingsFor: statisticsSettings,
  generate: (s, n) => generateStatsQuestions(s, n),
  correctAnswer: (q) => answerText(q),
  isCorrect: (q, a) => checkStatsAnswer(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
