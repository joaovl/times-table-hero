import type { ArithSettings, ArithOp, Difficulty, DigitMode } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `arithmetic-${base}-${userId}` : `arithmetic-${base}`;
}

const DEFAULT_SETTINGS: ArithSettings = {
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  multiplyLevel: 'd2x1',
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

export interface ArithPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: ArithPrintConfig = {
  pageCount: 1,
  questionsPerPage: 30,
};

export function getSavedArithPrintConfig(userId?: string): ArithPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) {
      const parsed = JSON.parse(data);
      return {
        pageCount: typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
        questionsPerPage: typeof parsed.questionsPerPage === 'number'
          ? parsed.questionsPerPage
          : typeof parsed.questionCount === 'number'
            ? parsed.questionCount
            : DEFAULT_PRINT_CONFIG.questionsPerPage,
      };
    }
    return DEFAULT_PRINT_CONFIG;
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveArithPrintConfig(config: ArithPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
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
