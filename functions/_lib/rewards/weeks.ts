const MS_DAY = 86_400_000;

const toUTC = (dateKey: string): Date => new Date(dateKey + 'T00:00:00Z');
const toKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Monday (ISO weekday 1) of the week containing dateKey. */
export function mondayOf(dateKey: string): string {
  const d = toUTC(dateKey);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return toKey(new Date(d.getTime() - dow * MS_DAY));
}

/** ISO-8601 week key like '2026-W28'. */
export function isoWeekKey(dateKey: string): string {
  const d = toUTC(dateKey);
  const day = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d.getTime() + (3 - day) * MS_DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / (7 * MS_DAY)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Inclusive list of 'YYYY-MM-DD' keys from start to end. */
export function dayKeysFrom(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(startKey).getTime(); t <= toUTC(endKey).getTime(); t += MS_DAY) {
    out.push(toKey(new Date(t)));
  }
  return out;
}
