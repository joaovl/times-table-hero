// Time module — multi-skill practice (read-analog-clock + time arithmetic).
//
// v2 adds a "time arithmetic" skill ("3:45 + 20 minutes = ?") alongside the
// original read-clock flow. Questions are a discriminated union over the
// `skill` field; legacy read-clock questions retain their original shape so
// the existing UI, PDF, and tests keep working unchanged.

import { integerChoices } from '@/lib/game/choices';
export type TimePrecision = 'hour' | 'half' | 'quarter' | '5min' | '1min';
export type TimeFormat = '12h' | '24h' | 'both';
export type TimeSkill =
  | 'read'
  | 'read-roman'
  | 'arith'
  | 'duration'
  | 'time-arith-pm'
  | 'all';
export type TimeArithDifficulty = 'easy' | 'medium' | 'hard';
export type TimeNumerals = 'arabic' | 'roman' | 'both';

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

export const TIME_SKILL_OPTIONS: ReadonlyArray<Exclude<TimeSkill, 'all'>> = [
  'read',
  'read-roman',
  'arith',
  'time-arith-pm',
  'duration',
];

export const TIME_SKILL_LABEL: Record<Exclude<TimeSkill, 'all'>, string> = {
  read: 'Read clock',
  'read-roman': 'Roman clock',
  arith: 'Time arithmetic',
  'time-arith-pm': 'PM arithmetic',
  duration: 'Duration',
};

export const TIME_NUMERALS_OPTIONS: ReadonlyArray<TimeNumerals> = [
  'arabic',
  'roman',
  'both',
];

export const TIME_NUMERALS_LABEL: Record<TimeNumerals, string> = {
  arabic: 'Arabic',
  roman: 'Roman',
  both: 'Both',
};

// Curriculum mapping (UK NC Y3-Y5). Single source of truth for setup chips
// and docs. `years` is a non-empty subset of {3,4,5}.
export interface CurriculumTag {
  years: ReadonlyArray<3 | 4 | 5>;
  objective: string;
}

export const CURRICULUM_TAGS: Record<Exclude<TimeSkill, 'all'>, CurriculumTag> = {
  read: {
    years: [3, 4],
    objective: 'Read and write the time on an analogue clock (Y3); read time to the nearest minute (Y4).',
  },
  'read-roman': {
    years: [3],
    objective: 'Read Roman numerals to XII on a clock face (Y3).',
  },
  arith: {
    years: [3, 4],
    objective: 'Solve problems involving converting and adding time intervals (Y3-Y4).',
  },
  'time-arith-pm': {
    years: [5],
    objective: 'Solve problems involving 12- and 24-hour time, including PM start times (Y5).',
  },
  duration: {
    years: [4, 5],
    objective: 'Calculate the duration between two times (Y4-Y5).',
  },
};

/**
 * Read-clock question — kid sees an analog clock and types the digital time.
 * Field names match the v1 shape so existing tests, UI, and PDF code keep
 * working without changes.
 */
export interface TimeReadQuestion {
  skill: 'read';
  hours: number;   // 24h-form (0..23)
  minutes: number; // 0..59
  /** "h:mm" — 12h form. */
  answer12h: string;
  /** "hh:mm" — 24h form. */
  answer24h: string;
  /** Display & expected-answer format. */
  format: '12h' | '24h';
}

/**
 * Time-arithmetic question — kid sees "3:45 + 20 minutes =" and types the
 * resulting time. `startHour` is stored in 24h form (0..23). `deltaMinutes`
 * is always positive; `sign` decides direction.
 */
export interface TimeArithQuestion {
  skill: 'arith';
  startHour: number;        // 0..23
  startMinute: number;      // 0..59
  deltaMinutes: number;     // > 0
  sign: '+' | '-';
  format: '12h' | '24h';
  /** Pre-computed result string in the chosen `format`. */
  answer: string;
  /** Pre-computed result hour (0..23) and minute (0..59), for UI helpers. */
  resultHour: number;
  resultMinute: number;
  /** True iff the result crosses midnight relative to the start. */
  crossesMidnight: boolean;
}

/**
 * Duration question — kid sees "How long from 3:30 to 5:45?" and types the
 * elapsed time. Accepted answer formats: "2h 15m", "2:15", "135" (total
 * minutes), "135 min". The duration is always positive (start <= end, or
 * the end wraps past midnight).
 */
export interface TimeDurationQuestion {
  skill: 'duration';
  startHour: number;        // 0..23
  startMinute: number;      // 0..59
  endHour: number;          // 0..23
  endMinute: number;        // 0..59
  /** Total elapsed minutes (always > 0). */
  totalMinutes: number;
  /** True iff end wraps past midnight (i.e. end is on the next day). */
  crossesMidnight: boolean;
  format: '12h' | '24h';
  /** Canonical "Hh Mm" answer string (e.g. "2h 15m" or "0h 45m"). */
  answer: string;
}

export type TimeQuestion =
  | TimeReadQuestion
  | TimeArithQuestion
  | TimeDurationQuestion;

export interface TimeSettings {
  /** Active skills. Non-empty. Default ['read']. */
  skills: Array<Exclude<TimeSkill, 'all'>>;
  /** Non-empty subset of TimePrecision (used by read-clock). Default ['hour']. */
  precisions: TimePrecision[];
  /** '12h' / '24h' / 'both' — 'both' picks per question. */
  format: TimeFormat;
  /** Clock numeral style — applies to the read-clock face only. */
  numerals: TimeNumerals;
  /** Difficulty for time-arithmetic. Ignored by read-clock. */
  arithDifficulty: TimeArithDifficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// Allowed minute values per precision (used by read-clock; also seeds the
// minute granularity of time-arithmetic).
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
 * 12h form with AM/PM suffix. Used for time-arith answers in 12-hour mode so
 * the kid disambiguates "4:05 AM" from "4:05 PM" when arithmetic crosses
 * midday or midnight. Format: "h:mm AM" / "h:mm PM".
 */
export function format12hAmPm(hours24: number, minutes: number): string {
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  return `${format12h(hours24, minutes)} ${suffix}`;
}

/**
 * Parse a digital-time string the kid typed. Accepts:
 *   "h:mm", "hh:mm", "h:m", "hh:m" — optionally followed by an AM/PM marker
 * (case-insensitive, optional dots, optional space). Returns null for
 * unparseable input.
 */
export function parseTimeInput(
  raw: string
): { hours: number; minutes: number; ampm: 'am' | 'pm' | null } | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Allow optional AM/PM suffix: " am", " a.m.", "PM", "p.m." etc.
  const m = trimmed.match(/^(\d{1,2}):(\d{1,2})\s*([aApP]\.?\s*[mM]\.?)?$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;
  if (hours < 0 || hours > 23) return null;
  let ampm: 'am' | 'pm' | null = null;
  if (m[3]) {
    const letter = m[3].trim().toLowerCase().charAt(0);
    ampm = letter === 'a' ? 'am' : 'pm';
  }
  return { hours, minutes, ampm };
}

/**
 * True iff `typed` matches the expected digital-time answer for a read-clock
 * question. AM/PM markers — if present in the typed string — are ignored
 * for read-clock (the clock face does not disambiguate AM/PM).
 *
 *   - 12h: typed hour must be 1..12 and equal the 12h face hour.
 *   - 24h: typed hour must be 0..23 and equal the 24h hour.
 *   - "3:45" and "03:45" both accepted.
 */
export function isReadAnswerCorrect(q: TimeReadQuestion, typed: string): boolean {
  const parsed = parseTimeInput(typed);
  if (!parsed) return false;
  if (parsed.minutes !== q.minutes) return false;

  if (q.format === '12h') {
    if (parsed.hours < 1 || parsed.hours > 12) return false;
    return parsed.hours === to12hHour(q.hours);
  }
  return parsed.hours === q.hours;
}

/**
 * True iff `typed` matches the expected answer for a time-arith question.
 * In 12-hour mode the expected answer carries an AM/PM marker — the typed
 * string must also include one (case-insensitive). In 24-hour mode AM/PM
 * is rejected (24-hour is unambiguous).
 */
export function isArithAnswerCorrect(q: TimeArithQuestion, typed: string): boolean {
  const parsed = parseTimeInput(typed);
  if (!parsed) return false;
  if (parsed.minutes !== q.resultMinute) return false;

  if (q.format === '12h') {
    // Require AM/PM and the right hour.
    if (parsed.ampm === null) return false;
    if (parsed.hours < 1 || parsed.hours > 12) return false;
    if (parsed.hours !== to12hHour(q.resultHour)) return false;
    const expectedAmpm = q.resultHour < 12 ? 'am' : 'pm';
    return parsed.ampm === expectedAmpm;
  }
  // 24h: reject AM/PM, require 0..23 match.
  if (parsed.ampm !== null) return false;
  return parsed.hours === q.resultHour;
}

/**
 * Parse a typed duration answer. Accepts (case-insensitive, whitespace
 * tolerant):
 *   - "2h 15m" / "2 h 15 m" / "2h15m"
 *   - "2h" (hours only) / "45m" (minutes only)
 *   - "2:15" (h:mm)
 *   - "135" (minutes)
 *   - "135 min" / "135 mins" / "135 minute" / "135 minutes"
 * Returns the total minutes, or null if unparseable.
 */
export function parseDurationInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!cleaned) return null;

  // "h:mm" form — only when followed by exactly one ":"; reject "h:mm AM/PM".
  if (/^\d{1,3}:\d{1,2}$/.test(cleaned)) {
    const [hStr, mStr] = cleaned.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  // "Xh Ym" / "Xh" / "Ym" form (mix with optional space).
  const hmMatch = cleaned.match(/^(?:(\d{1,3})\s*h)?\s*(?:(\d{1,3})\s*m(?:in(?:ute)?s?)?)?$/);
  if (hmMatch && (hmMatch[1] !== undefined || hmMatch[2] !== undefined)) {
    const h = hmMatch[1] !== undefined ? parseInt(hmMatch[1], 10) : 0;
    const m = hmMatch[2] !== undefined ? parseInt(hmMatch[2], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Pure minutes (with optional " min"/"mins"/"minute"/"minutes" suffix).
  const minMatch = cleaned.match(/^(\d{1,4})(?:\s*(?:min|mins|minute|minutes))?$/);
  if (minMatch) {
    const total = parseInt(minMatch[1], 10);
    if (isNaN(total)) return null;
    return total;
  }

  return null;
}

/**
 * True iff `typed` matches the expected duration. Compares total minutes
 * (so "2h 15m", "2:15", "135", "135 min" all match a 135-minute answer).
 */
export function isDurationAnswerCorrect(
  q: TimeDurationQuestion,
  typed: string
): boolean {
  const parsed = parseDurationInput(typed);
  if (parsed === null) return false;
  return parsed === q.totalMinutes;
}

/**
 * True iff `typed` matches the expected answer for any TimeQuestion.
 * Dispatches on the question's `skill`.
 */
export function isAnswerCorrect(q: TimeQuestion, typed: string): boolean {
  if (q.skill === 'arith') return isArithAnswerCorrect(q, typed);
  if (q.skill === 'duration') return isDurationAnswerCorrect(q, typed);
  return isReadAnswerCorrect(q, typed);
}

function buildReadQuestion(format: '12h' | '24h', precision: TimePrecision): TimeReadQuestion {
  const minutes = pick(allowedMinutes(precision));
  let hours: number;
  if (format === '12h') {
    // 12h clock face: kid sees 1..12, stored as a 24h hour in the 1..12 range
    // so the AM half is unambiguous for v1.
    hours = randInt(1, 12);
  } else {
    hours = randInt(0, 23);
  }
  return {
    skill: 'read',
    hours,
    minutes,
    answer12h: format12h(hours, minutes),
    answer24h: format24h(hours, minutes),
    format,
  };
}

/**
 * Add a positive minute delta to a 24h time, wrapping modulo 1440 (24h).
 * Returns the new hour/minute and a flag indicating whether the operation
 * crossed midnight (the day boundary).
 */
function addMinutes(
  hour: number,
  minute: number,
  delta: number
): { hour: number; minute: number; crossed: boolean } {
  const totalStart = hour * 60 + minute;
  const totalEnd = totalStart + delta;
  const wrapped = ((totalEnd % 1440) + 1440) % 1440;
  const crossed = Math.floor(totalEnd / 1440) !== Math.floor(totalStart / 1440);
  return {
    hour: Math.floor(wrapped / 60),
    minute: wrapped % 60,
    crossed,
  };
}

/** Pick a granularity for the time-arith delta. 5-minute steps feel natural
 *  for kids; we use the chosen precision set to seed the step size, falling
 *  back to 5 if only 'hour' / 'half' are selected. */
function arithStepMinutes(precisions: TimePrecision[]): number {
  if (precisions.includes('1min')) return 1;
  if (precisions.includes('5min')) return 5;
  if (precisions.includes('quarter')) return 15;
  if (precisions.includes('half')) return 30;
  return 60;
}

function buildArithQuestion(
  format: '12h' | '24h',
  precisions: TimePrecision[],
  difficulty: TimeArithDifficulty,
  /** If true, the start time is forced into the PM half (13..23 in 24h
   *  storage; rendered as 1..11 PM in 12h mode). Used by `time-arith-pm`. */
  allowPmStart = false
): TimeArithQuestion {
  const step = arithStepMinutes(precisions);
  // Start time always uses an allowed minute from the chosen precisions so
  // the picker shows times the kid recognises.
  const minuteChoices = precisions.flatMap(p => allowedMinutes(p));
  const dedupedMinutes = Array.from(new Set(minuteChoices));
  const startMinute = pick(dedupedMinutes.length > 0 ? dedupedMinutes : [0]);

  // Start hour bounds depend on difficulty so we can guarantee the result
  // crosses (or does not cross) the relevant boundary.
  let startHour: number;
  let delta: number;
  let sign: '+' | '-';

  // Allowed start-hour range. allowPmStart forces the PM half of the day
  // (12..23 in 24h storage; renders as 12 PM, 1..11 PM in 12h mode).
  // For non-PM mode, easy/medium honour the 1..12 storage-range convention
  // when format is 12h (so the start time is unambiguously AM); hard ignores
  // that and uses the full 0..23 day so the picker has room to wrap midnight.
  const minStartHourAllowed = allowPmStart ? 12 : (format === '12h' ? 1 : 0);
  const maxStartHourAllowed = allowPmStart ? 23 : (format === '12h' ? 12 : 23);
  const minStartHourHard = allowPmStart ? 12 : 0;
  const maxStartHourHard = 23;

  if (difficulty === 'easy') {
    // Same-hour: the delta must keep us inside the same hour. Choose a
    // delta strictly less than (60 - startMinute) for '+' or <= startMinute
    // for '-'.
    sign = Math.random() < 0.5 ? '+' : '-';
    // Pick start hour anywhere; for 12h mode keep 1..12 for clarity.
    startHour = randInt(minStartHourAllowed, maxStartHourAllowed);
    if (sign === '+') {
      const maxDelta = 59 - startMinute;
      if (maxDelta < step) {
        // No room — flip to '-' or shrink delta to 1.
        sign = '-';
        const cap = Math.max(1, startMinute);
        delta = Math.max(1, Math.min(cap, step));
      } else {
        const maxSteps = Math.floor(maxDelta / step);
        delta = step * randInt(1, Math.max(1, maxSteps));
      }
    } else {
      const maxDelta = startMinute;
      if (maxDelta < step) {
        sign = '+';
        const cap = Math.max(1, 59 - startMinute);
        delta = Math.max(1, Math.min(cap, step));
      } else {
        const maxSteps = Math.floor(maxDelta / step);
        delta = step * randInt(1, Math.max(1, maxSteps));
      }
    }
  } else if (difficulty === 'medium') {
    // Crosses at least one hour boundary but stays in-day.
    sign = Math.random() < 0.5 ? '+' : '-';
    // Delta 60..240 mins, snapped to step.
    const stepsInRange = Math.max(1, Math.floor((240 - 60) / step));
    delta = 60 + step * randInt(0, stepsInRange);
    // Pick start hour with enough headroom to avoid crossing midnight.
    if (sign === '+') {
      // total = startHour*60 + startMinute + delta < 1440
      const maxStartTotal = 1440 - delta - 1;
      const minStartTotal = 60; // give space after midnight for the boundary to matter
      const maxStartHour = Math.min(maxStartHourAllowed, Math.floor(maxStartTotal / 60));
      const minStartHour = Math.max(minStartHourAllowed, Math.floor(minStartTotal / 60));
      startHour = randInt(Math.min(minStartHour, maxStartHour), maxStartHour);
    } else {
      // total = startHour*60 + startMinute - delta >= 0
      const minStartTotal = delta;
      const minStartHour = Math.max(minStartHourAllowed, Math.ceil(minStartTotal / 60));
      const maxStartHour = maxStartHourAllowed;
      startHour = randInt(Math.min(minStartHour, maxStartHour), maxStartHour);
    }
  } else {
    // hard: crosses midnight. Bound delta to [60..360] so we have room on
    // both sides for the start hour to satisfy the constraint regardless of
    // the picked startMinute.
    sign = Math.random() < 0.5 ? '+' : '-';
    const stepsInRange = Math.max(1, Math.floor((360 - 60) / step));
    delta = 60 + step * randInt(0, stepsInRange);
    if (sign === '+') {
      // Need startTotal + delta >= 1440, so
      //   startHour*60 + startMinute >= 1440 - delta
      //   startHour >= ceil((1440 - delta - startMinute) / 60).
      const minStartHour = Math.max(
        minStartHourHard,
        Math.ceil((1440 - delta - startMinute) / 60)
      );
      const maxStartHour = maxStartHourHard;
      startHour = randInt(Math.min(minStartHour, maxStartHour), maxStartHour);
    } else {
      // Need startTotal - delta < 0, so
      //   startHour*60 + startMinute < delta
      //   startHour < (delta - startMinute) / 60.
      // delta is >= 60 so even startMinute=59 gives at least startHour=0 valid.
      // When allowPmStart, the lower bound 12 makes this branch infeasible
      // (going backwards from PM never crosses midnight); in that case we
      // flip to '+' so the resulting question still crosses midnight.
      const naturalMax = Math.max(0, Math.floor((delta - startMinute - 1) / 60));
      if (allowPmStart) {
        sign = '+';
        const minStartHour = Math.max(
          minStartHourHard,
          Math.ceil((1440 - delta - startMinute) / 60)
        );
        const maxStartHour = maxStartHourHard;
        startHour = randInt(Math.min(minStartHour, maxStartHour), maxStartHour);
      } else {
        const maxStartHour = Math.max(minStartHourHard, naturalMax);
        startHour = randInt(minStartHourHard, maxStartHour);
      }
    }
  }

  // Compute the result, applying sign.
  const signedDelta = sign === '+' ? delta : -delta;
  const totalStart = startHour * 60 + startMinute;
  const totalEnd = totalStart + signedDelta;
  const wrapped = ((totalEnd % 1440) + 1440) % 1440;
  const resultHour = Math.floor(wrapped / 60);
  const resultMinute = wrapped % 60;
  const crossesMidnight =
    Math.floor(totalEnd / 1440) !== Math.floor(totalStart / 1440);

  const answer =
    format === '12h'
      ? format12hAmPm(resultHour, resultMinute)
      : format24h(resultHour, resultMinute);

  return {
    skill: 'arith',
    startHour,
    startMinute,
    deltaMinutes: delta,
    sign,
    format,
    answer,
    resultHour,
    resultMinute,
    crossesMidnight,
  };
}

function buildDurationQuestion(
  format: '12h' | '24h',
  precisions: TimePrecision[],
  difficulty: TimeArithDifficulty
): TimeDurationQuestion {
  const step = arithStepMinutes(precisions);
  // Duration uses multiples-of-5 by convention regardless of the per-question
  // precision step, EXCEPT when the user has selected 1-min precision (where
  // we honour the finer step). Per spec: easy/medium use ≥5, hard ≥5.
  const stride = step === 1 ? 5 : step;

  // Random start time inside the day. Minute uses the chosen precision so
  // numbers look familiar.
  const minuteChoices = precisions.flatMap(p => allowedMinutes(p));
  const dedupedMinutes = Array.from(new Set(minuteChoices));
  const startMinute = pick(dedupedMinutes.length > 0 ? dedupedMinutes : [0]);

  let totalMinutes: number;
  let startHour: number;

  if (difficulty === 'easy') {
    // Same hour, total < 60 min, multiples of `stride` (5 by default).
    // Need end_minute = start_minute + total <= 59.
    const maxTotal = 59 - startMinute;
    if (maxTotal < stride) {
      // Tight: pick startMinute=0 to allow at least one stride.
      startHour = randInt(format === '12h' ? 1 : 0, format === '12h' ? 12 : 23);
      const m0 = 0;
      const start0 = startHour * 60 + m0;
      const end0 = start0 + stride;
      return finaliseDuration(start0, end0, format);
    }
    const maxSteps = Math.floor(maxTotal / stride);
    totalMinutes = stride * randInt(1, Math.max(1, maxSteps));
    startHour = randInt(format === '12h' ? 1 : 0, format === '12h' ? 12 : 23);
  } else if (difficulty === 'medium') {
    // Crosses 1-2 hours: 60..150 minutes, multiples of 5 or 15.
    const strideMed = stride === 1 ? 5 : stride;
    const stepsRange = Math.max(1, Math.floor((150 - 60) / strideMed));
    totalMinutes = 60 + strideMed * randInt(0, stepsRange);
    // Keep in-day: startTotal + totalMinutes < 1440.
    const startTotalMax = 1440 - totalMinutes - 1;
    const minHr = format === '12h' ? 1 : 0;
    const maxHr = Math.min(format === '12h' ? 12 : 23, Math.floor(startTotalMax / 60));
    startHour = randInt(minHr, Math.max(minHr, maxHr));
  } else {
    // hard: crosses 2+ hours OR crosses midnight. Half the time we wrap
    // midnight so the kid practises the "next day" case.
    const strideHard = stride === 1 ? 5 : stride;
    const stepsRange = Math.max(1, Math.floor((360 - 120) / strideHard));
    totalMinutes = 120 + strideHard * randInt(0, stepsRange);
    const wrap = Math.random() < 0.5;
    if (wrap) {
      // Need startTotal + totalMinutes >= 1440.
      const minStartTotal = 1440 - totalMinutes;
      const minHr = Math.max(
        format === '12h' ? 1 : 0,
        Math.ceil((minStartTotal - startMinute) / 60)
      );
      const maxHr = format === '12h' ? 12 : 23;
      startHour = randInt(Math.min(minHr, maxHr), maxHr);
    } else {
      const startTotalMax = 1440 - totalMinutes - 1;
      const minHr = format === '12h' ? 1 : 0;
      const maxHr = Math.min(format === '12h' ? 12 : 23, Math.floor(startTotalMax / 60));
      startHour = randInt(minHr, Math.max(minHr, maxHr));
    }
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = startTotal + totalMinutes;
  return finaliseDuration(startTotal, endTotal, format);
}

/** Shared finaliser: turn a (startTotal, endTotal) pair into a duration
 *  question, wrapping end past midnight if needed. */
function finaliseDuration(
  startTotal: number,
  endTotal: number,
  format: '12h' | '24h'
): TimeDurationQuestion {
  const totalMinutes = endTotal - startTotal;
  const crossesMidnight = endTotal >= 1440;
  const wrappedEnd = ((endTotal % 1440) + 1440) % 1440;
  const startHour = Math.floor(startTotal / 60);
  const startMinute = startTotal % 60;
  const endHour = Math.floor(wrappedEnd / 60);
  const endMinute = wrappedEnd % 60;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const answer = `${h}h ${m}m`;
  return {
    skill: 'duration',
    startHour,
    startMinute,
    endHour,
    endMinute,
    totalMinutes,
    crossesMidnight,
    format,
    answer,
  };
}

/** Human-readable prompt for a duration question, e.g. "How long from 3:30 to 5:45?". */
export function formatDurationPrompt(q: TimeDurationQuestion): string {
  const start =
    q.format === '12h'
      ? format12hAmPm(q.startHour, q.startMinute)
      : format24h(q.startHour, q.startMinute);
  const end =
    q.format === '12h'
      ? format12hAmPm(q.endHour, q.endMinute)
      : format24h(q.endHour, q.endMinute);
  return `How long from ${start} to ${end}?`;
}

export function generateTimeQuestions(settings: TimeSettings, count: number): TimeQuestion[] {
  const precisions =
    settings.precisions.length > 0 ? settings.precisions : ['hour' as TimePrecision];
  const skills =
    settings.skills && settings.skills.length > 0 ? settings.skills : ['read' as const];
  const out: TimeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pick(skills);
    const fmt: '12h' | '24h' =
      settings.format === 'both' ? (Math.random() < 0.5 ? '12h' : '24h') : settings.format;
    if (skill === 'arith') {
      out.push(buildArithQuestion(fmt, precisions, settings.arithDifficulty));
    } else if (skill === 'time-arith-pm') {
      // Same arithmetic engine, PM-only start window.
      out.push(buildArithQuestion(fmt, precisions, settings.arithDifficulty, true));
    } else if (skill === 'duration') {
      out.push(buildDurationQuestion(fmt, precisions, settings.arithDifficulty));
    } else {
      // 'read' and 'read-roman' share the same TimeReadQuestion shape; the
      // numeral style is applied at render time from settings.numerals.
      const precision = pick(precisions);
      out.push(buildReadQuestion(fmt, precision));
    }
  }
  return out;
}

/** Human-readable equation for a time-arith question, e.g. "3:45 + 20 minutes =". */
export function formatArithEquation(q: TimeArithQuestion): string {
  const start =
    q.format === '12h'
      ? format12hAmPm(q.startHour, q.startMinute)
      : format24h(q.startHour, q.startMinute);
  const minLabel = q.deltaMinutes === 1 ? 'minute' : 'minutes';
  return `${start} ${q.sign} ${q.deltaMinutes} ${minLabel} =`;
}

/** Expected answer string for any question — used by the play screen for
 *  the "you said" hint and by the PDF answer key. */
export function expectedAnswerString(q: TimeQuestion): string {
  if (q.skill === 'arith') return q.answer;
  if (q.skill === 'duration') return q.answer;
  return q.format === '24h' ? q.answer24h : q.answer12h;
}

// --- Roman numerals ---------------------------------------------------------
// Clock faces use the traditional 12-numeral set: I, II, III, IV, V, VI, VII,
// VIII, IX, X, XI, XII. All ASCII letters → encoding safe for jsPDF's
// Helvetica/WinAnsi.

const ROMAN_NUMERALS_1_TO_12: ReadonlyArray<string> = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

/** Roman numeral for an hour 1..12. Out-of-range inputs return ''. */
export function toRomanHour(h: number): string {
  if (!Number.isInteger(h) || h < 1 || h > 12) return '';
  return ROMAN_NUMERALS_1_TO_12[h - 1];
}

/**
 * Numeral label to render at clock position `hour` (1..12) for a chosen
 * numeral style. For `both`, the traditional decorative convention is used:
 * Roman at 12/3/6/9 (cardinal positions), Arabic elsewhere.
 */
export function numeralForHour(hour: number, style: TimeNumerals): string {
  if (style === 'roman') return toRomanHour(hour);
  if (style === 'arabic') return String(hour);
  // 'both': Roman at 12/3/6/9; Arabic elsewhere.
  if (hour === 12 || hour === 3 || hour === 6 || hour === 9) {
    return toRomanHour(hour);
  }
  return String(hour);
}

// Re-exported helper for tests that exercise the internal arithmetic engine
// without going through the public picker.
export { addMinutes as _addMinutesForTests };

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: TimeQuestion, difficulty: Difficulty): string[] {
  const s = expectedAnswerString(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !isAnswerCorrect(q, c));
}
