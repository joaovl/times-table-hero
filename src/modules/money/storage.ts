import type { Difficulty, MoneySettings, MoneySkill } from './logic';
import { MONEY_SKILL_OPTIONS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `money-${base}-${userId}` : `money-${base}`;
}

const DEFAULT_SETTINGS: MoneySettings = {
  skills: ['add-money'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown, fallback: MoneySkill[]): MoneySkill[] {
  if (!Array.isArray(value)) return fallback;
  const allowed = new Set<string>(MONEY_SKILL_OPTIONS);
  const cleaned = value
    .filter((s): s is MoneySkill => typeof s === 'string' && allowed.has(s))
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function getSavedMoneySettings(userId?: string): MoneySettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<MoneySettings>;
    return {
      skills: normaliseSkills(parsed.skills, DEFAULT_SETTINGS.skills),
      difficulty: parsed.difficulty ?? DEFAULT_SETTINGS.difficulty,
      gameMode: parsed.gameMode ?? DEFAULT_SETTINGS.gameMode,
      questionCount: parsed.questionCount ?? DEFAULT_SETTINGS.questionCount,
      timeLimit: parsed.timeLimit ?? DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveMoneySettings(s: MoneySettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface MoneyPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: MoneyPrintConfig = {
  pageCount: 1,
  questionsPerPage: 16,
};

export function getSavedMoneyPrintConfig(userId?: string): MoneyPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (!data) return DEFAULT_PRINT_CONFIG;
    const parsed = JSON.parse(data);
    return {
      pageCount:
        typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
      questionsPerPage:
        typeof parsed.questionsPerPage === 'number'
          ? parsed.questionsPerPage
          : DEFAULT_PRINT_CONFIG.questionsPerPage,
    };
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveMoneyPrintConfig(config: MoneyPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface MoneySession {
  date: string;
  score: number;
  total: number;
  skills: MoneySkill[];
  difficulty: Difficulty;
}

export function saveMoneySession(s: MoneySession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: MoneySession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getMoneySessions(userId?: string): MoneySession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
