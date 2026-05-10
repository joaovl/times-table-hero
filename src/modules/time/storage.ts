import type { TimeSettings, TimePrecision, TimeFormat } from './logic';
import { TIME_PRECISION_OPTIONS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `time-${base}-${userId}` : `time-${base}`;
}

const DEFAULT_SETTINGS: TimeSettings = {
  precisions: ['hour'],
  format: '12h',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normalisePrecisions(value: unknown): TimePrecision[] {
  const valid = new Set<string>(TIME_PRECISION_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter((v): v is TimePrecision => typeof v === 'string' && valid.has(v));
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.precisions;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as TimePrecision];
  }
  return DEFAULT_SETTINGS.precisions;
}

function normaliseFormat(value: unknown): TimeFormat {
  if (value === '12h' || value === '24h' || value === 'both') return value;
  return DEFAULT_SETTINGS.format;
}

export function getSavedTimeSettings(userId?: string): TimeSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<TimeSettings>;
    return {
      precisions: normalisePrecisions(parsed.precisions),
      format: normaliseFormat(parsed.format),
      gameMode: parsed.gameMode === 'time' ? 'time' : 'questions',
      questionCount: typeof parsed.questionCount === 'number'
        ? parsed.questionCount
        : DEFAULT_SETTINGS.questionCount,
      timeLimit: typeof parsed.timeLimit === 'number'
        ? parsed.timeLimit
        : DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveTimeSettings(s: TimeSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface TimePrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: TimePrintConfig = {
  pageCount: 1,
  questionsPerPage: 15,
};

export function getSavedTimePrintConfig(userId?: string): TimePrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (!data) return DEFAULT_PRINT_CONFIG;
    const parsed = JSON.parse(data);
    return {
      pageCount: typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
      questionsPerPage: typeof parsed.questionsPerPage === 'number'
        ? parsed.questionsPerPage
        : DEFAULT_PRINT_CONFIG.questionsPerPage,
    };
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveTimePrintConfig(config: TimePrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface TimeSession {
  date: string;
  score: number;
  total: number;
  precisions: TimePrecision[];
  format: TimeFormat;
}

export function saveTimeSession(s: TimeSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: TimeSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getTimeSessions(userId?: string): TimeSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
