import type { ChartSkill } from './logic';
import { CHART_SKILL_LABEL, CHART_SKILL_OPTIONS } from './logic';

// Page-count picker options.
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Charts need real estate — keep counts low. 4 ≈ generous, 10 ≈ packed.
export const PRINT_PER_PAGE_OPTIONS = [4, 6, 8, 10];

/**
 * Compact summary line for the print modal and setup. Mirrors the shape used
 * by the other modules: `<skill list> • up to <maxValue> • <numCategories> categories`.
 */
export function buildChartsSummary(
  skills: ChartSkill[],
  maxValue: number,
  numCategories: number,
): string {
  // Canonical ordering so the summary is stable regardless of click order.
  const order = new Map<ChartSkill, number>(
    CHART_SKILL_OPTIONS.map((s, i) => [s, i]),
  );
  const sorted = [...skills].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  const labels = sorted.length === 0
    ? [CHART_SKILL_LABEL['read-bar']]
    : sorted.map(s => CHART_SKILL_LABEL[s]);
  return `${labels.join(', ')} • up to ${maxValue} • ${numCategories} categories`;
}
