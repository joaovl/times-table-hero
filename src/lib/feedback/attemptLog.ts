// A tiny rolling log of the child's most recent answered questions, kept in
// sessionStorage. When a grown-up raises a bug, we attach this so the report
// includes the question that actually caused it — usually the PREVIOUS one,
// because the app has already advanced by the time they react.

export interface Attempt {
  module: string;
  skill?: string;
  question: string; // human-readable prompt
  typed: string; // what the child entered
  correct: boolean;
  expected?: string; // the answer the app treated as correct
  at: string; // ISO timestamp
}

const KEY = 'tth_recent_attempts';
const MAX = 5;

export function recordAttempt(a: Omit<Attempt, 'at'>): void {
  try {
    const list = getRecentAttempts();
    list.push({ ...a, at: new Date().toISOString() });
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // sessionStorage unavailable (private mode etc.) — feedback still works,
    // it just won't carry recent-attempt context.
  }
}

export function getRecentAttempts(): Attempt[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function clearRecentAttempts(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
