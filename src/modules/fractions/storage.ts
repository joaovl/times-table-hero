import type { FractionSettings, FractionSkill } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `fractions-${base}-${userId}` : `fractions-${base}`;
}

const DEFAULT_SETTINGS: FractionSettings = {
  skills: ['add-same'],
  denominators: [2, 3, 4],
  simplify: true,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

const VALID_SKILLS: FractionSkill[] = [
  'add-same',
  'sub-same',
  'add-diff',
  'sub-diff',
  'id',
  'eq',
  'cmp',
  'mixed',
  'mul-by-whole',
  'mixed-mul-whole',
  'mul-frac',
  'to-decimal',
  'from-decimal',
];

function normaliseSkills(value: unknown, fallback: FractionSkill[]): FractionSkill[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((s): s is FractionSkill =>
      typeof s === 'string' && (VALID_SKILLS as string[]).includes(s)
    )
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normaliseDenominators(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((d): d is number => typeof d === 'number' && d >= 2 && d <= 12)
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function getSavedFractionSettings(userId?: string): FractionSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<FractionSettings>;
    return {
      skills: normaliseSkills(parsed.skills, DEFAULT_SETTINGS.skills),
      denominators: normaliseDenominators(parsed.denominators, DEFAULT_SETTINGS.denominators),
      simplify: typeof parsed.simplify === 'boolean' ? parsed.simplify : DEFAULT_SETTINGS.simplify,
      gameMode: parsed.gameMode === 'time' ? 'time' : 'questions',
      questionCount:
        typeof parsed.questionCount === 'number' ? parsed.questionCount : DEFAULT_SETTINGS.questionCount,
      timeLimit:
        typeof parsed.timeLimit === 'number' ? parsed.timeLimit : DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveFractionSettings(s: FractionSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface FractionPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: FractionPrintConfig = {
  pageCount: 1,
  questionsPerPage: 18,
};

export function getSavedFractionPrintConfig(userId?: string): FractionPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) {
      const parsed = JSON.parse(data);
      return {
        pageCount:
          typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
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

export function saveFractionPrintConfig(config: FractionPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface FractionSession {
  date: string;
  score: number;
  total: number;
  skills: FractionSkill[];
  denominators: number[];
  simplify: boolean;
}

export function saveFractionSession(s: FractionSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: FractionSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getFractionSessions(userId?: string): FractionSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
