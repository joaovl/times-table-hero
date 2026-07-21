import type { PlayableModule } from '../moduleContract';
import { wordProblemsSettings } from '../settings';
import {
  WORD_SKILL_OPTIONS,
  generateWordQuestions,
  checkWordAnswer,
  expectedAnswerString,
  generateChoices,
  type WordQuestion,
  type WordSettings,
} from '@/modules/word-problems/logic';

export const wordProblemsModule: PlayableModule<WordSettings, WordQuestion> = {
  slug: 'word-problems',
  skills: [...WORD_SKILL_OPTIONS],
  settingsFor: wordProblemsSettings,
  generate: (s, n) => generateWordQuestions(s, n),
  correctAnswer: (q) => expectedAnswerString(q),
  isCorrect: (q, a) => checkWordAnswer(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
