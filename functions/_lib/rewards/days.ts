import type { PracticeSession } from './types';

/** 'YYYY-MM-DD' for the given instant in a timezone expressed as a minute offset. */
export function localDayKey(iso: string, tzOffsetMin: number): string {
  const shifted = new Date(new Date(iso).getTime() + tzOffsetMin * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function groupByLocalDay(
  sessions: PracticeSession[],
  tzOffsetMin: number,
): Map<string, PracticeSession[]> {
  const out = new Map<string, PracticeSession[]>();
  for (const s of sessions) {
    const key = localDayKey(s.startedAt, tzOffsetMin);
    const bucket = out.get(key);
    if (bucket) bucket.push(s);
    else out.set(key, [s]);
  }
  return out;
}
