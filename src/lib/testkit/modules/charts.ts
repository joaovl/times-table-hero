import type { PlayableModule } from '../moduleContract';
import { chartsSettings } from '../settings';
import {
  CHART_SKILL_OPTIONS,
  generateChartQuestions,
  isAnswerCorrect,
  generateChartChoices,
  chartHideValueIndices,
  type ChartQuestion,
  type ChartSettings,
} from '@/modules/charts/logic';

// Canonical answer string per expectedKind (mirrors ChartsPlay.formatCorrectAnswer
// and chartOracle.expectedString).
function correctAnswer(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  if (kind === 'trend' && q.expectedTrend) return q.expectedTrend;
  if (kind === 'time' && q.expectedTime) return q.expectedTime;
  return String(q.answer);
}

export const chartsModule: PlayableModule<ChartSettings, ChartQuestion> = {
  slug: 'charts',
  skills: [...CHART_SKILL_OPTIONS],
  settingsFor: chartsSettings,
  generate: (s, n) => generateChartQuestions(s, n),
  correctAnswer,
  isCorrect: (q, a) => isAnswerCorrect(q, a),
  choices: (q) => generateChartChoices(q, 'easy'),
  hiddenValueIndices: (q) => chartHideValueIndices(q),
};
