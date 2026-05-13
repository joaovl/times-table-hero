import type { RatioSettings, RatioSkill, Difficulty } from './logic';
import { ALL_SKILLS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `ratio-proportion-${base}-${userId}` : `ratio-proportion-${base}`;
}

const DEFAULT_SETTINGS: RatioSettings = {
  skills: ['percent-of'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

const VALID_SKILL_SET = new Set<string>(ALL_SKILLS);

function normaliseSkills(value: unknown, fallback: RatioSkill[]): RatioSkill[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((s): s is RatioSkill => typeof s === 'string' && VALID_SKILL_SET.has(s))
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normaliseDifficulty(value: unknown, fallback: Difficulty): Difficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return fallback;
}

export function getSavedRatioSettings(userId?: string): RatioSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<RatioSettings>;
    return {
      skills: normaliseSkills(parsed.skills, DEFAULT_SETTINGS.skills),
      difficulty: normaliseDifficulty(parsed.difficulty, DEFAULT_SETTINGS.difficulty),
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

export function saveRatioSettings(s: RatioSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface RatioPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: RatioPrintConfig = {
  pageCount: 1,
  questionsPerPage: 20,
};

export function getSavedRatioPrintConfig(userId?: string): RatioPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (!data) return DEFAULT_PRINT_CONFIG;
    const parsed = JSON.parse(data);
    return {
      pageCount: typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
      questionsPerPage:
        typeof parsed.questionsPerPage === 'number' ? parsed.questionsPerPage : DEFAULT_PRINT_CONFIG.questionsPerPage,
    };
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveRatioPrintConfig(config: RatioPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface RatioSession {
  date: string;
  score: number;
  total: number;
  skills: RatioSkill[];
  difficulty: Difficulty;
}

export function saveRatioSession(s: RatioSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: RatioSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getRatioSessions(userId?: string): RatioSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
