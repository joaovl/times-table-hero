import type { TimePrecision, TimeFormat, TimeSkill } from './logic';
import {
  TIME_PRECISION_LABEL,
  TIME_PRECISION_OPTIONS,
  TIME_SKILL_LABEL,
  TIME_SKILL_OPTIONS,
} from './logic';

// Page-count picker options (independent of precision).
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Clocks need real estate — fewer questions per page than text-only modules.
export const PRINT_PER_PAGE_OPTIONS = [10, 15, 20];

const FORMAT_LABEL: Record<TimeFormat, string> = {
  '12h': '12h',
  '24h': '24h',
  both: '12h + 24h',
};

/**
 * Compact summary line for the print modal & setup. Lists active skills
 * first (so the parent sees what kind of questions to expect), then the
 * precision set, then the format.
 *
 * Backwards-compatible: passing only `(precisions, format)` produces the
 * same string as before — the skills segment is omitted when the caller
 * doesn't pass it.
 */
export function buildTimeSummary(
  precisions: TimePrecision[],
  format: TimeFormat,
  skills?: Array<Exclude<TimeSkill, 'all'>>
): string {
  const precisionOrder = new Map<TimePrecision, number>(
    TIME_PRECISION_OPTIONS.map((p, i) => [p, i])
  );
  const sortedPrec = [...precisions].sort(
    (a, b) => (precisionOrder.get(a) ?? 0) - (precisionOrder.get(b) ?? 0)
  );
  const precisionLabels =
    sortedPrec.length === 0 ? [TIME_PRECISION_LABEL.hour] : sortedPrec.map(p => TIME_PRECISION_LABEL[p]);

  const segments: string[] = [];

  if (skills && skills.length > 0) {
    const skillOrder = new Map<Exclude<TimeSkill, 'all'>, number>(
      TIME_SKILL_OPTIONS.map((s, i) => [s, i])
    );
    const sortedSkills = [...skills].sort(
      (a, b) => (skillOrder.get(a) ?? 0) - (skillOrder.get(b) ?? 0)
    );
    segments.push(sortedSkills.map(s => TIME_SKILL_LABEL[s]).join(' + '));
  }

  segments.push(precisionLabels.join(', '));
  segments.push(FORMAT_LABEL[format]);

  return segments.join(' • ');
}
