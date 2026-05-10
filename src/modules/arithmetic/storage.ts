import type { ArithSettings, ArithOp, Difficulty, DigitMode } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `arithmetic-${base}-${userId}` : `arithmetic-${base}`;
}

const DEFAULT_SETTINGS: ArithSettings = {
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

export function getSavedArithSettings(userId?: string): ArithSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveArithSettings(s: ArithSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ArithPrintSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
  questionCount: number;
  pageCount: number;
}

const DEFAULT_PRINT: ArithPrintSettings = {
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  questionCount: 30,
  pageCount: 1,
};

export function getSavedArithPrintSettings(userId?: string): ArithPrintSettings {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) return { ...DEFAULT_PRINT, ...JSON.parse(data) };
    return DEFAULT_PRINT;
  } catch {
    return DEFAULT_PRINT;
  }
}

export function saveArithPrintSettings(s: ArithPrintSettings, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ArithSession {
  date: string;
  score: number;
  total: number;
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
}

export function saveArithSession(s: ArithSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ArithSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getArithSessions(userId?: string): ArithSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
