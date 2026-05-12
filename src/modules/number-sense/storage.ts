import type { NumberSenseSettings, NumberSenseSkill, Difficulty } from './logic';
import { ALL_SKILLS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `numbersense-${base}-${userId}` : `numbersense-${base}`;
}

const DEFAULT_SETTINGS: NumberSenseSettings = {
  skills: ['place-value-3d'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

const VALID_SKILL_SET = new Set<string>(ALL_SKILLS);

function normaliseSkills(value: unknown, fallback: NumberSenseSkill[]): NumberSenseSkill[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .filter((s): s is NumberSenseSkill => typeof s === 'string' && VALID_SKILL_SET.has(s))
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normaliseDifficulty(value: unknown, fallback: Difficulty): Difficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return fallback;
}

export function getSavedNumberSenseSettings(userId?: string): NumberSenseSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<NumberSenseSettings> & {
      // Older single-skill saves may have stored `skill: string` instead of
      // `skills: string[]`. Migrate transparently.
      skill?: string;
    };

    const migratedSkills =
      parsed.skill && typeof parsed.skill === 'string' && VALID_SKILL_SET.has(parsed.skill)
        ? [parsed.skill as NumberSenseSkill]
        : undefined;

    return {
      skills: migratedSkills ?? normaliseSkills(parsed.skills, DEFAULT_SETTINGS.skills),
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

export function saveNumberSenseSettings(s: NumberSenseSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface NumberSensePrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: NumberSensePrintConfig = {
  pageCount: 1,
  questionsPerPage: 20,
};

export function getSavedNumberSensePrintConfig(userId?: string): NumberSensePrintConfig {
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

export function saveNumberSensePrintConfig(config: NumberSensePrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface NumberSenseSession {
  date: string;
  score: number;
  total: number;
  skills: NumberSenseSkill[];
  difficulty: Difficulty;
}

export function saveNumberSenseSession(s: NumberSenseSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: NumberSenseSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getNumberSenseSessions(userId?: string): NumberSenseSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
