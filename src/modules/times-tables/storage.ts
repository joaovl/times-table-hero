// Progress tracking with localStorage, namespaced by userId

import type { Question, BinaryOp, UnaryOp } from './logic';

export interface QuestionRecord {
  multiplier: number;
  multiplicand: number;
  op?: BinaryOp | UnaryOp;
  timesWrong: number;
  timesCorrect: number;
  lastAttempt: string;
}

export interface GameSession {
  date: string;
  score: number;
  total: number;
  difficulty: string;
  tables: number[];
  incorrectQuestions: Array<{
    multiplier: number;
    multiplicand: number;
    userAnswer: number | null;
    correctAnswer: number;
  }>;
}

function getStorageKey(base: string, userId?: string): string {
  if (userId) {
    return `maths-challenge-${base}-${userId}`;
  }
  return `maths-challenge-${base}`;
}

export function getProgress(userId?: string): Record<string, QuestionRecord> {
  try {
    const key = getStorageKey('progress', userId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, QuestionRecord>, userId?: string): void {
  const key = getStorageKey('progress', userId);
  localStorage.setItem(key, JSON.stringify(progress));
}

export function getQuestionKey(q: Question): string {
  if (q.kind === 'binary') {
    const sep = q.op === 'multiply' ? 'x' : 'd';
    return `${q.operand1}${sep}${q.operand2}`;
  }
  const suffix = q.op === 'square' ? 'sq' : 'rt';
  return `${q.operand}${suffix}`;
}

export function recordAnswer(
  question: Question,
  correct: boolean,
  userId?: string
): void {
  const progress = getProgress(userId);
  const key = getQuestionKey(question);

  if (!progress[key]) {
    const base = {
      timesWrong: 0,
      timesCorrect: 0,
      lastAttempt: new Date().toISOString(),
    };
    if (question.kind === 'binary') {
      progress[key] = {
        ...base,
        op: question.op,
        multiplier: question.operand1,
        multiplicand: question.operand2,
      };
    } else {
      progress[key] = {
        ...base,
        op: question.op,
        multiplier: question.operand,
        multiplicand: question.answer,
      };
    }
  }

  if (correct) {
    progress[key].timesCorrect++;
  } else {
    progress[key].timesWrong++;
  }
  progress[key].lastAttempt = new Date().toISOString();

  saveProgress(progress, userId);
}

export function getChallengingQuestions(userId?: string): QuestionRecord[] {
  const progress = getProgress(userId);
  return Object.values(progress)
    .filter(q => q.timesWrong > q.timesCorrect)
    .sort((a, b) => (b.timesWrong - b.timesCorrect) - (a.timesWrong - a.timesCorrect));
}

export function getImprovedQuestions(
  incorrectThisSession: Array<{ multiplier: number; multiplicand: number }>,
  userId?: string
): QuestionRecord[] {
  const progress = getProgress(userId);
  return incorrectThisSession
    .map(q => progress[`${q.multiplier}x${q.multiplicand}`])
    .filter(q => q && q.timesWrong > 0 && q.timesCorrect > 0);
}

export function saveSession(session: GameSession, userId?: string): void {
  try {
    const sessions = getSessions(userId);
    sessions.push(session);
    // Keep only last 50 sessions
    const trimmed = sessions.slice(-50);
    const key = getStorageKey('sessions', userId);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function getSessions(userId?: string): GameSession[] {
  try {
    const key = getStorageKey('sessions', userId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getTotalStats(userId?: string): { totalGames: number; totalCorrect: number; totalQuestions: number } {
  const sessions = getSessions(userId);
  return {
    totalGames: sessions.length,
    totalCorrect: sessions.reduce((sum, s) => sum + s.score, 0),
    totalQuestions: sessions.reduce((sum, s) => sum + s.total, 0),
  };
}

export interface SavedSettings {
  tables: number[];
  difficulty: string;
  gameMode: string;
  operation: string;
  questionCount: number;
  timeLimit: number;
}

const DEFAULT_SETTINGS: SavedSettings = {
  tables: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  difficulty: 'medium',
  gameMode: 'time',
  operation: 'multiply',
  questionCount: 10,
  timeLimit: 180,
};

export function getSavedSettings(userId?: string): SavedSettings {
  try {
    const key = getStorageKey('settings', userId);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      if (parsed.operation === 'both') parsed.operation = 'all';
      return parsed;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SavedSettings, userId?: string): void {
  try {
    const key = getStorageKey('settings', userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export interface PrintSavedSettings {
  tables: number[];
  operation: string;
  questionCount: number;
  pageCount: number;
}

const DEFAULT_PRINT_SETTINGS: PrintSavedSettings = {
  tables: [2, 3, 4, 5],
  operation: 'multiply',
  questionCount: 40,
  pageCount: 1,
};

export function getSavedPrintSettings(userId?: string): PrintSavedSettings {
  try {
    const key = getStorageKey('printSettings', userId);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(data) };
      if (parsed.operation === 'both') parsed.operation = 'all';
      return parsed;
    }
    return DEFAULT_PRINT_SETTINGS;
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function savePrintSettings(settings: PrintSavedSettings, userId?: string): void {
  try {
    const key = getStorageKey('printSettings', userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
