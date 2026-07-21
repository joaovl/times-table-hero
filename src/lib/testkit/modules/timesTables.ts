import type { PlayableModule } from '../moduleContract';
import { timesTablesSettings } from '../settings';
import {
  generateQuestions,
  factChoices,
  type Question,
  type GameSettings,
  type Operation,
} from '@/modules/times-tables/logic';

// Times-tables uses `operation` rather than a `skills` array; it grades by
// numeric equality (no exported grader) and builds MC options via factChoices.
const OPERATIONS: Operation[] = ['multiply', 'divide', 'square', 'sqrt', 'all'];

export const timesTablesModule: PlayableModule<GameSettings, Question> = {
  slug: 'times-tables',
  skills: OPERATIONS,
  settingsFor: timesTablesSettings,
  // generateQuestions takes (tables, count, operation) — not a settings object.
  generate: (s, n) => generateQuestions(s.tables, n, s.operation),
  correctAnswer: (q) => String(q.answer),
  isCorrect: (q, a) => Number(a) === q.answer,
  choices: (q) => factChoices(q.answer, 'easy'),
};
