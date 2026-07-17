import type { OracleData } from '@/lib/e2e/oracle';
import { chartHighlightIndices, type ChartQuestion } from './logic';

// Oracle for any chart question. `numberChoices` are the buttons the player
// sees for numeric-answer skills ([] when the skill is typed). `expected` is
// the canonical answer string; `highlightCount` is the clue detector (0 for
// everything except pie-fraction).
export function chartOracle(q: ChartQuestion, numberChoices: string[]): OracleData {
  const expected = expectedString(q);
  const inputMode: 'choices' | 'typed' = numberChoices.length > 0 ? 'choices' : 'typed';
  return {
    questionId: JSON.stringify(q),
    expected,
    inputMode,
    choices: inputMode === 'choices' ? numberChoices : undefined,
    correctChoice: inputMode === 'choices' ? expected : undefined,
    highlightCount: chartHighlightIndices(q).length,
  };
}

function expectedString(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  if (kind === 'trend' && q.expectedTrend) return q.expectedTrend;
  if (kind === 'time' && q.expectedTime) return q.expectedTime;
  return String(q.answer);
}
