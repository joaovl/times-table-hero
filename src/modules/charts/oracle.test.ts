import { describe, it, expect } from 'vitest';
import { chartOracle } from './oracle';
import { generateChartQuestions } from './logic';
import type { ChartSettings } from './logic';

const base = (over: Partial<ChartSettings>): ChartSettings => ({
  skills: ['read-bar'], maxValue: 50, numCategories: 5,
  gameMode: 'questions', questionCount: 10, timeLimit: 60, ...over,
});

describe('chartOracle', () => {
  it('reports zero highlights for read-bar (no answer clue)', () => {
    const q = generateChartQuestions(base({ skills: ['read-bar'] }), 1)[0];
    const o = chartOracle(q, [String(q.answer), '1', '2']);
    expect(o.highlightCount).toBe(0);
    expect(o.expected).toBe(String(q.answer));
    expect(o.inputMode).toBe('choices');
    expect(o.correctChoice).toBe(String(q.answer));
  });
  it('reports a highlight for pie-fraction (its prompt refers to it)', () => {
    const q = generateChartQuestions(base({ skills: ['pie-fraction'] }), 1)[0];
    const o = chartOracle(q, []);
    expect(o.highlightCount).toBeGreaterThan(0);
  });
});
