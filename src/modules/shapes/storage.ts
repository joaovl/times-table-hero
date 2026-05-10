import type {
  ShapeSettings,
  ShapeSkill,
  ShapeUnits,
  ShapeDifficulty,
} from './logic';
import {
  SHAPE_SKILL_OPTIONS,
  SHAPE_UNIT_OPTIONS,
  SHAPE_DIFFICULTY_OPTIONS,
} from './logic';

function key(base: string, userId?: string): string {
  return userId ? `shapes-${base}-${userId}` : `shapes-${base}`;
}

const DEFAULT_SETTINGS: ShapeSettings = {
  skills: ['name-2d'],
  units: 'cm',
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown): ShapeSkill[] {
  const valid = new Set<string>(SHAPE_SKILL_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter((v): v is ShapeSkill => typeof v === 'string' && valid.has(v));
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.skills;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as ShapeSkill];
  }
  return DEFAULT_SETTINGS.skills;
}

function normaliseUnits(value: unknown): ShapeUnits {
  if (typeof value === 'string' && (SHAPE_UNIT_OPTIONS as readonly string[]).includes(value)) {
    return value as ShapeUnits;
  }
  return DEFAULT_SETTINGS.units;
}

function normaliseDifficulty(value: unknown): ShapeDifficulty {
  if (typeof value === 'string' && (SHAPE_DIFFICULTY_OPTIONS as readonly string[]).includes(value)) {
    return value as ShapeDifficulty;
  }
  return DEFAULT_SETTINGS.difficulty;
}

export function getSavedShapeSettings(userId?: string): ShapeSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<ShapeSettings>;
    return {
      skills: normaliseSkills(parsed.skills),
      units: normaliseUnits(parsed.units),
      difficulty: normaliseDifficulty(parsed.difficulty),
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

export function saveShapeSettings(s: ShapeSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ShapePrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: ShapePrintConfig = {
  pageCount: 1,
  questionsPerPage: 12,
};

export function getSavedShapePrintConfig(userId?: string): ShapePrintConfig {
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

export function saveShapePrintConfig(config: ShapePrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface ShapeSession {
  date: string;
  score: number;
  total: number;
  skills: ShapeSkill[];
  units: ShapeUnits;
  difficulty: ShapeDifficulty;
}

export function saveShapeSession(s: ShapeSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ShapeSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getShapeSessions(userId?: string): ShapeSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
