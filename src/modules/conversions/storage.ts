import type {
  ConversionSettings,
  ConversionSkill,
  ConversionDifficulty,
} from './logic';
import {
  CONVERSION_SKILL_OPTIONS,
  CONVERSION_DIFFICULTY_OPTIONS,
} from './logic';

function key(base: string, userId?: string): string {
  return userId ? `conversions-${base}-${userId}` : `conversions-${base}`;
}

const DEFAULT_SETTINGS: ConversionSettings = {
  skills: ['length-cm-mm'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown): ConversionSkill[] {
  const valid = new Set<string>(CONVERSION_SKILL_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter(
      (v): v is ConversionSkill => typeof v === 'string' && valid.has(v)
    );
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.skills;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as ConversionSkill];
  }
  return DEFAULT_SETTINGS.skills;
}

function normaliseDifficulty(value: unknown): ConversionDifficulty {
  if (
    typeof value === 'string' &&
    (CONVERSION_DIFFICULTY_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as ConversionDifficulty;
  }
  return DEFAULT_SETTINGS.difficulty;
}

export function getSavedConversionSettings(userId?: string): ConversionSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<ConversionSettings>;
    return {
      skills: normaliseSkills(parsed.skills),
      difficulty: normaliseDifficulty(parsed.difficulty),
      gameMode: parsed.gameMode === 'time' ? 'time' : 'questions',
      questionCount:
        typeof parsed.questionCount === 'number'
          ? parsed.questionCount
          : DEFAULT_SETTINGS.questionCount,
      timeLimit:
        typeof parsed.timeLimit === 'number'
          ? parsed.timeLimit
          : DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveConversionSettings(s: ConversionSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ConversionPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: ConversionPrintConfig = {
  pageCount: 1,
  questionsPerPage: 20,
};

export function getSavedConversionPrintConfig(userId?: string): ConversionPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (!data) return DEFAULT_PRINT_CONFIG;
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
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveConversionPrintConfig(
  config: ConversionPrintConfig,
  userId?: string
): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface ConversionSession {
  date: string;
  score: number;
  total: number;
  skills: ConversionSkill[];
  difficulty: ConversionDifficulty;
}

export function saveConversionSession(s: ConversionSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ConversionSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getConversionSessions(userId?: string): ConversionSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
