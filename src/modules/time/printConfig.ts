import type { TimePrecision, TimeFormat } from './logic';
import { TIME_PRECISION_LABEL, TIME_PRECISION_OPTIONS } from './logic';

// Page-count picker options (independent of precision).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Clocks need real estate — fewer questions per page than text-only modules.
export const PRINT_PER_PAGE_OPTIONS = [10, 15, 20];

const FORMAT_LABEL: Record<TimeFormat, string> = {
  '12h': '12h',
  '24h': '24h',
  both: '12h + 24h',
};

/** Compact summary line for the print modal & setup. */
export function buildTimeSummary(precisions: TimePrecision[], format: TimeFormat): string {
  // Preserve the canonical precision ordering so the summary is stable
  // regardless of the order the user clicked the chips.
  const order = new Map<TimePrecision, number>(
    TIME_PRECISION_OPTIONS.map((p, i) => [p, i])
  );
  const sorted = [...precisions].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  const labels = sorted.length === 0
    ? [TIME_PRECISION_LABEL.hour]
    : sorted.map(p => TIME_PRECISION_LABEL[p]);
  return `${labels.join(', ')} • ${FORMAT_LABEL[format]}`;
}
