import type { ChartSettings, ChartSkill } from './logic';
import { CHART_SKILL_OPTIONS, CHART_MAX_VALUE_OPTIONS, CHART_NUM_CATEGORIES_OPTIONS } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `charts-${base}-${userId}` : `charts-${base}`;
}

const DEFAULT_SETTINGS: ChartSettings = {
  skills: ['read-bar'],
  maxValue: 50,
  numCategories: 5,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

function normaliseSkills(value: unknown): ChartSkill[] {
  const valid = new Set<string>(CHART_SKILL_OPTIONS);
  if (Array.isArray(value)) {
    const cleaned = value.filter((v): v is ChartSkill => typeof v === 'string' && valid.has(v));
    const deduped = Array.from(new Set(cleaned));
    return deduped.length > 0 ? deduped : DEFAULT_SETTINGS.skills;
  }
  if (typeof value === 'string' && valid.has(value)) {
    return [value as ChartSkill];
  }
  return DEFAULT_SETTINGS.skills;
}

function normaliseMaxValue(value: unknown): number {
  const allowed = new Set<number>(CHART_MAX_VALUE_OPTIONS as unknown as number[]);
  if (typeof value === 'number' && allowed.has(value)) return value;
  return DEFAULT_SETTINGS.maxValue;
}

function normaliseNumCategories(value: unknown): number {
  const allowed = new Set<number>(CHART_NUM_CATEGORIES_OPTIONS as unknown as number[]);
  if (typeof value === 'number' && allowed.has(value)) return value;
  return DEFAULT_SETTINGS.numCategories;
}

export function getSavedChartsSettings(userId?: string): ChartSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<ChartSettings>;
    return {
      skills: normaliseSkills(parsed.skills),
      maxValue: normaliseMaxValue(parsed.maxValue),
      numCategories: normaliseNumCategories(parsed.numCategories),
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

export function saveChartsSettings(s: ChartSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ChartsPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: ChartsPrintConfig = {
  pageCount: 1,
  questionsPerPage: 6,
};

export function getSavedChartsPrintConfig(userId?: string): ChartsPrintConfig {
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

export function saveChartsPrintConfig(config: ChartsPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface ChartsSession {
  date: string;
  score: number;
  total: number;
  skills: ChartSkill[];
  maxValue: number;
  numCategories: number;
}

export function saveChartsSession(s: ChartsSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ChartsSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getChartsSessions(userId?: string): ChartsSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
