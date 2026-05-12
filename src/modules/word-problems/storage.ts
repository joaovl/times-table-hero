import type {
  WordSettings,
  WordProblemSkill,
  WordDifficulty,
} from './logic';
import { WORD_SKILL_OPTIONS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `word-problems-${base}-${userId}` : `word-problems-${base}`;
}

const DEFAULT_SETTINGS: WordSettings = {
  skills: ['arith-1step', 'money-1step'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown): WordProblemSkill[] {
  const valid = new Set<string>(WORD_SKILL_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter(
      (v): v is WordProblemSkill => typeof v === 'string' && valid.has(v)
    );
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.skills;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as WordProblemSkill];
  }
  return DEFAULT_SETTINGS.skills;
}

function normaliseDifficulty(value: unknown): WordDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return DEFAULT_SETTINGS.difficulty;
}

export function getSavedWordSettings(userId?: string): WordSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<WordSettings> & Record<string, unknown>;
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

export function saveWordSettings(s: WordSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface WordPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: WordPrintConfig = {
  pageCount: 1,
  questionsPerPage: 6,
};

export function getSavedWordPrintConfig(userId?: string): WordPrintConfig {
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

export function saveWordPrintConfig(config: WordPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface WordSession {
  date: string;
  score: number;
  total: number;
  skills: WordProblemSkill[];
  difficulty: WordDifficulty;
}

export function saveWordSession(s: WordSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: WordSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getWordSessions(userId?: string): WordSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
