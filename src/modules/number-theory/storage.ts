import type {
  NumberTheoryDifficulty,
  NumberTheorySettings,
  NumberTheorySkill,
} from './logic';
import {
  NUMBER_THEORY_DIFFICULTY_OPTIONS,
  NUMBER_THEORY_SKILL_OPTIONS,
} from './logic';

function key(base: string, userId?: string): string {
  return userId ? `number-theory-${base}-${userId}` : `number-theory-${base}`;
}

const DEFAULT_SETTINGS: NumberTheorySettings = {
  skills: ['factors'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown): NumberTheorySkill[] {
  const valid = new Set<string>(NUMBER_THEORY_SKILL_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter(
      (v): v is NumberTheorySkill => typeof v === 'string' && valid.has(v)
    );
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.skills;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as NumberTheorySkill];
  }
  return DEFAULT_SETTINGS.skills;
}

function normaliseDifficulty(value: unknown): NumberTheoryDifficulty {
  if (
    typeof value === 'string' &&
    (NUMBER_THEORY_DIFFICULTY_OPTIONS as readonly string[]).includes(value)
  ) {
    return value as NumberTheoryDifficulty;
  }
  return DEFAULT_SETTINGS.difficulty;
}

export function getSavedNumberTheorySettings(userId?: string): NumberTheorySettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<NumberTheorySettings>;
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

export function saveNumberTheorySettings(
  s: NumberTheorySettings,
  userId?: string
): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface NumberTheoryPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: NumberTheoryPrintConfig = {
  pageCount: 1,
  questionsPerPage: 16,
};

export function getSavedNumberTheoryPrintConfig(
  userId?: string
): NumberTheoryPrintConfig {
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

export function saveNumberTheoryPrintConfig(
  config: NumberTheoryPrintConfig,
  userId?: string
): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface NumberTheorySession {
  date: string;
  score: number;
  total: number;
  skills: NumberTheorySkill[];
  difficulty: NumberTheoryDifficulty;
}

export function saveNumberTheorySession(
  s: NumberTheorySession,
  userId?: string
): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: NumberTheorySession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getNumberTheorySessions(userId?: string): NumberTheorySession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
