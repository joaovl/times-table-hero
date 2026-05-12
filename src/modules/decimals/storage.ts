import type { DecimalsSettings, DecimalsSkill } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `decimals-${base}-${userId}` : `decimals-${base}`;
}

const DEFAULT_SETTINGS: DecimalsSettings = {
  skills: ['identify-tenths'],
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

const VALID_SKILLS: DecimalsSkill[] = [
  'identify-tenths',
  'identify-hundredths',
  'identify-thousandths',
  'round-1dp',
  'round-2dp',
  'compare-decimals',
  'fraction-to-decimal',
  'decimal-to-fraction',
  'percent-fraction',
  'percent-decimal',
  'decimal-percent',
  'add-decimals',
  'subtract-decimals',
];

function normaliseSkills(value: unknown, fallback: DecimalsSkill[]): DecimalsSkill[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((s): s is DecimalsSkill =>
      typeof s === 'string' && (VALID_SKILLS as string[]).includes(s)
    )
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function getSavedDecimalsSettings(userId?: string): DecimalsSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<DecimalsSettings>;
    return {
      skills: normaliseSkills(parsed.skills, DEFAULT_SETTINGS.skills),
      gameMode: parsed.gameMode === 'time' ? 'time' : 'questions',
      questionCount:
        typeof parsed.questionCount === 'number'
          ? parsed.questionCount
          : DEFAULT_SETTINGS.questionCount,
      timeLimit:
        typeof parsed.timeLimit === 'number' ? parsed.timeLimit : DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDecimalsSettings(s: DecimalsSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface DecimalsPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: DecimalsPrintConfig = {
  pageCount: 1,
  questionsPerPage: 20,
};

export function getSavedDecimalsPrintConfig(userId?: string): DecimalsPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) {
      const parsed = JSON.parse(data);
      return {
        pageCount:
          typeof parsed.pageCount === 'number'
            ? parsed.pageCount
            : DEFAULT_PRINT_CONFIG.pageCount,
        questionsPerPage:
          typeof parsed.questionsPerPage === 'number'
            ? parsed.questionsPerPage
            : DEFAULT_PRINT_CONFIG.questionsPerPage,
      };
    }
    return DEFAULT_PRINT_CONFIG;
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveDecimalsPrintConfig(config: DecimalsPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface DecimalsSession {
  date: string;
  score: number;
  total: number;
  skills: DecimalsSkill[];
}

export function saveDecimalsSession(s: DecimalsSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: DecimalsSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getDecimalsSessions(userId?: string): DecimalsSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
