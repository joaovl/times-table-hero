import type { AlgebraSettings, AlgebraSkill, Difficulty } from './logic';
import { ALL_SKILLS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `algebra-${base}-${userId}` : `algebra-${base}`;
}

const DEFAULT_SETTINGS: AlgebraSettings = {
  skills: ['missing-number'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

const VALID = new Set<string>(ALL_SKILLS);

function normSkills(v: unknown, fallback: AlgebraSkill[]): AlgebraSkill[] {
  if (!Array.isArray(v)) return fallback;
  const cleaned = v
    .filter((s): s is AlgebraSkill => typeof s === 'string' && VALID.has(s))
    .filter((s, i, a) => a.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normDifficulty(v: unknown, fallback: Difficulty): Difficulty {
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return fallback;
}

export function getSavedAlgebraSettings(userId?: string): AlgebraSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<AlgebraSettings>;
    return {
      skills: normSkills(parsed.skills, DEFAULT_SETTINGS.skills),
      difficulty: normDifficulty(parsed.difficulty, DEFAULT_SETTINGS.difficulty),
      gameMode: parsed.gameMode === 'time' ? 'time' : 'questions',
      questionCount: typeof parsed.questionCount === 'number' ? parsed.questionCount : DEFAULT_SETTINGS.questionCount,
      timeLimit: typeof parsed.timeLimit === 'number' ? parsed.timeLimit : DEFAULT_SETTINGS.timeLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAlgebraSettings(s: AlgebraSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface AlgebraPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: AlgebraPrintConfig = {
  pageCount: 1,
  questionsPerPage: 20,
};

export function getSavedAlgebraPrintConfig(userId?: string): AlgebraPrintConfig {
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

export function saveAlgebraPrintConfig(config: AlgebraPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface AlgebraSession {
  date: string;
  score: number;
  total: number;
  skills: AlgebraSkill[];
  difficulty: Difficulty;
}

export function saveAlgebraSession(s: AlgebraSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: AlgebraSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getAlgebraSessions(userId?: string): AlgebraSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
