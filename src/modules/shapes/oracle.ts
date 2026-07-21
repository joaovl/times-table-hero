import type { OracleData } from '@/lib/e2e/oracle';
import { answerString, type ShapeQuestion } from './logic';

// Shapes answers are a name, a count, or a measurement. `options` are the
// multiple-choice buttons the Play shows for integer-answer skills ([] when it
// falls back to a typed field). Coord-plot / grid-click skills are excluded
// from the browser matrix (see every-option SKIP) — they can't be driven from
// a text oracle.
export function shapesOracle(q: ShapeQuestion, options: string[]): OracleData {
  const expected = answerString(q);
  const inputMode: 'choices' | 'typed' = options.length > 0 ? 'choices' : 'typed';
  return {
    questionId: JSON.stringify(q),
    expected,
    inputMode,
    choices: inputMode === 'choices' ? options : undefined,
    correctChoice: inputMode === 'choices' ? (options.includes(expected) ? expected : 'None of these') : undefined,
    highlightCount: 0,
  };
}
