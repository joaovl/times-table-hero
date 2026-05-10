import type { ArithSettings, ArithOp, Difficulty } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `arithmetic-${base}-${userId}` : `arithmetic-${base}`;
}

const DEFAULT_SETTINGS: ArithSettings = {
  operation: 'add',
  difficulty: 'easy',
  addSubFirstDigits: [2],
  addSubSecondDigits: [2],
  multiplyFirstDigits: [2],
  multiplySecondDigits: [1],
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

// Legacy persisted shape used MultiplyLevel ('facts' | 'd2x1' | ...).
// Migrate transparently when loading.
const LEGACY_LEVEL_TO_DIGITS: Record<string, [number, number]> = {
  facts: [1, 1],
  d2x1: [2, 1],
  d2x2: [2, 2],
  d3x1: [3, 1],
  d3x2: [3, 2],
  d4x1: [4, 1],
  d5x1: [5, 1],
};

// Older saves stored digitMode: { kind: 'exact' | 'upTo', digits: N }.
type LegacyDigitMode =
  | { kind: 'exact'; digits: number }
  | { kind: 'upTo'; digits: number };

function digitModeToSet(dm: LegacyDigitMode): number[] {
  if (dm.kind === 'exact') return [dm.digits];
  // 'upTo' N → [1..N]
  const n = Math.max(1, Math.min(5, dm.digits));
  return Array.from({ length: n }, (_, i) => i + 1);
}

function normaliseSet(value: unknown, fallback: number[]): number[] {
  if (typeof value === 'number') {
    return [value];
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((d): d is number => typeof d === 'number' && d >= 1 && d <= 5)
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .sort((a, b) => a - b);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  return fallback;
}

export function getSavedArithSettings(userId?: string): ArithSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data) as Partial<ArithSettings> & {
      multiplyLevel?: string;
      digitMode?: LegacyDigitMode;
      // Older shapes may carry numbers instead of arrays for these:
      multiplyFirstDigits?: unknown;
      multiplySecondDigits?: unknown;
      addSubFirstDigits?: unknown;
      addSubSecondDigits?: unknown;
    };

    const merged: ArithSettings = {
      ...DEFAULT_SETTINGS,
      operation: parsed.operation ?? DEFAULT_SETTINGS.operation,
      difficulty: parsed.difficulty ?? DEFAULT_SETTINGS.difficulty,
      addSubFirstDigits: normaliseSet(parsed.addSubFirstDigits, DEFAULT_SETTINGS.addSubFirstDigits),
      addSubSecondDigits: normaliseSet(parsed.addSubSecondDigits, DEFAULT_SETTINGS.addSubSecondDigits),
      multiplyFirstDigits: normaliseSet(parsed.multiplyFirstDigits, DEFAULT_SETTINGS.multiplyFirstDigits),
      multiplySecondDigits: normaliseSet(parsed.multiplySecondDigits, DEFAULT_SETTINGS.multiplySecondDigits),
      gameMode: parsed.gameMode ?? DEFAULT_SETTINGS.gameMode,
      questionCount: parsed.questionCount ?? DEFAULT_SETTINGS.questionCount,
      timeLimit: parsed.timeLimit ?? DEFAULT_SETTINGS.timeLimit,
    };

    // Legacy digitMode → addSub digit sets. Only apply when the saved blob
    // didn't already carry the new addSub arrays (i.e. first-time migration).
    if (parsed.digitMode && !Array.isArray(parsed.addSubFirstDigits)) {
      const set = digitModeToSet(parsed.digitMode);
      merged.addSubFirstDigits = set;
      merged.addSubSecondDigits = set;
    }

    // Legacy multiplyLevel string overrides per-operand digit sets.
    if (parsed.multiplyLevel && LEGACY_LEVEL_TO_DIGITS[parsed.multiplyLevel]) {
      const [d1, d2] = LEGACY_LEVEL_TO_DIGITS[parsed.multiplyLevel];
      merged.multiplyFirstDigits = [d1];
      merged.multiplySecondDigits = [d2];
    }

    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveArithSettings(s: ArithSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ArithPrintConfig {
  pageCount: number;
  questionsPerPage: number;
}

const DEFAULT_PRINT_CONFIG: ArithPrintConfig = {
  pageCount: 1,
  questionsPerPage: 30,
};

export function getSavedArithPrintConfig(userId?: string): ArithPrintConfig {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) {
      const parsed = JSON.parse(data);
      return {
        pageCount: typeof parsed.pageCount === 'number' ? parsed.pageCount : DEFAULT_PRINT_CONFIG.pageCount,
        questionsPerPage: typeof parsed.questionsPerPage === 'number'
          ? parsed.questionsPerPage
          : typeof parsed.questionCount === 'number'
            ? parsed.questionCount
            : DEFAULT_PRINT_CONFIG.questionsPerPage,
      };
    }
    return DEFAULT_PRINT_CONFIG;
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

export function saveArithPrintConfig(config: ArithPrintConfig, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface ArithSession {
  date: string;
  score: number;
  total: number;
  operation: ArithOp;
  difficulty: Difficulty;
  addSubFirstDigits: number[];
  addSubSecondDigits: number[];
}

export function saveArithSession(s: ArithSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ArithSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getArithSessions(userId?: string): ArithSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
