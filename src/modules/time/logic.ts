// Time module — read-analog-clock practice.
//
// v1 scope: kid reads an analog clock and types the digital time. Time
// arithmetic, draw-the-hands, and matching skills are deferred to v2.

export type TimePrecision = 'hour' | 'half' | 'quarter' | '5min' | '1min';
export type TimeFormat = '12h' | '24h' | 'both';

export const TIME_PRECISION_OPTIONS: ReadonlyArray<TimePrecision> = [
  'hour',
  'half',
  'quarter',
  '5min',
  '1min',
];

export const TIME_PRECISION_LABEL: Record<TimePrecision, string> = {
  hour: 'hour',
  half: 'half-hour',
  quarter: 'quarter',
  '5min': '5-min',
  '1min': '1-min',
};

export interface TimeQuestion {
  // Hours stored in 24h form (0..23); minutes 0..59. The picked display
  // format determines which string the kid is expected to type.
  hours: number;
  minutes: number;
  /** "h:mm" — 12h form. Hour always 1..12. */
  answer12h: string;
  /** "hh:mm" — 24h form. Hour always 0..23, two-digit padded. */
  answer24h: string;
  /** The format chosen for this question's display & expected answer. */
  format: '12h' | '24h';
}

export interface TimeSettings {
  /** Non-empty subset of TimePrecision. Default ['hour']. */
  precisions: TimePrecision[];
  /** '12h' / '24h' / 'both' — 'both' picks per question. */
  format: TimeFormat;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// Allowed minute values per precision.
export function allowedMinutes(p: TimePrecision): number[] {
  switch (p) {
    case 'hour':
      return [0];
    case 'half':
      return [0, 30];
    case 'quarter':
      return [0, 15, 30, 45];
    case '5min':
      return Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
    case '1min':
      return Array.from({ length: 60 }, (_, i) => i); // 0..59
  }
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Convert any 24h hour (0..23) to 12h face hour (1..12). */
export function to12hHour(h24: number): number {
  const h = ((h24 % 12) + 12) % 12;
  return h === 0 ? 12 : h;
}

export function format12h(hours24: number, minutes: number): string {
  return `${to12hHour(hours24)}:${minutes.toString().padStart(2, '0')}`;
}

export function format24h(hours24: number, minutes: number): string {
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Parse a digital-time string the kid typed. Accepts:
 *   "h:mm", "hh:mm", "h:m", "hh:m".
 * Returns null for unparseable input.
 */
export function parseTimeInput(raw: string): { hours: number; minutes: number } | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;
  // 12h: 1..12. 24h: 0..23. Caller decides which range to accept;
  // we accept the union (0..23) and let the matcher handle equivalence.
  if (hours < 0 || hours > 23) return null;
  return { hours, minutes };
}

/**
 * True iff `typed` matches the expected answer string for the given question.
 * Equivalence rules:
 *   - 12h answer "3:45" matches "3:45" or "03:45".
 *   - 24h answer "03:45" matches "03:45" or "3:45".
 *   - When `format` is '12h' the typed hour is interpreted as 1..12 and must
 *     equal the question's 12h hour; when '24h', typed must equal the 24h hour.
 */
export function isAnswerCorrect(q: TimeQuestion, typed: string): boolean {
  const parsed = parseTimeInput(typed);
  if (!parsed) return false;
  if (parsed.minutes !== q.minutes) return false;

  if (q.format === '12h') {
    // Typed hour interpreted as 12h face hour. Reject 0 and >12.
    if (parsed.hours < 1 || parsed.hours > 12) return false;
    return parsed.hours === to12hHour(q.hours);
  }
  // 24h
  return parsed.hours === q.hours;
}

function buildQuestion(format: '12h' | '24h', precision: TimePrecision): TimeQuestion {
  const minutes = pick(allowedMinutes(precision));
  let hours: number;
  if (format === '12h') {
    // 12h clock face: kid sees 1..12, but we store the hour as a 24h value
    // (1..12 — AM half is fine for v1; midnight handling deferred).
    hours = randInt(1, 12);
  } else {
    hours = randInt(0, 23);
  }
  return {
    hours,
    minutes,
    answer12h: format12h(hours, minutes),
    answer24h: format24h(hours, minutes),
    format,
  };
}

export function generateTimeQuestions(settings: TimeSettings, count: number): TimeQuestion[] {
  const precisions = settings.precisions.length > 0 ? settings.precisions : ['hour' as TimePrecision];
  const out: TimeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const precision = pick(precisions);
    const fmt: '12h' | '24h' =
      settings.format === 'both' ? (Math.random() < 0.5 ? '12h' : '24h') : settings.format;
    out.push(buildQuestion(fmt, precision));
  }
  return out;
}
