import type { PlayableModule } from '../moduleContract';
import { shapeSettings } from '../settings';
import {
  SHAPE_SKILL_OPTIONS,
  generateShapeQuestions,
  isAnswerCorrect,
  answerString,
  generateChoices,
  type ShapeQuestion,
  type ShapeSettings,
} from '@/modules/shapes/logic';

export const shapesModule: PlayableModule<ShapeSettings, ShapeQuestion> = {
  slug: 'shapes',
  skills: [...SHAPE_SKILL_OPTIONS],
  settingsFor: shapeSettings,
  generate: (s, n) => generateShapeQuestions(s, n),
  correctAnswer: (q) => answerString(q),
  isCorrect: (q, a) => isAnswerCorrect(q, a),
  choices: (q) => generateChoices(q, 'easy'),
};
