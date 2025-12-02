// Progress tracking with localStorage

export interface QuestionRecord {
  multiplier: number;
  multiplicand: number;
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

const STORAGE_KEY = 'multiplication-game-progress';
const SESSIONS_KEY = 'multiplication-game-sessions';

export function getProgress(): Record<string, QuestionRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, QuestionRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getQuestionKey(multiplier: number, multiplicand: number): string {
  return `${multiplier}x${multiplicand}`;
}

export function recordAnswer(
  multiplier: number,
  multiplicand: number,
  correct: boolean
): void {
  const progress = getProgress();
  const key = getQuestionKey(multiplier, multiplicand);
  
  if (!progress[key]) {
    progress[key] = {
      multiplier,
      multiplicand,
      timesWrong: 0,
      timesCorrect: 0,
      lastAttempt: new Date().toISOString(),
    };
  }
  
  if (correct) {
    progress[key].timesCorrect++;
  } else {
    progress[key].timesWrong++;
  }
  progress[key].lastAttempt = new Date().toISOString();
  
  saveProgress(progress);
}

export function getChallengingQuestions(): QuestionRecord[] {
  const progress = getProgress();
  return Object.values(progress)
    .filter(q => q.timesWrong > q.timesCorrect)
    .sort((a, b) => (b.timesWrong - b.timesCorrect) - (a.timesWrong - a.timesCorrect));
}

export function getImprovedQuestions(
  incorrectThisSession: Array<{ multiplier: number; multiplicand: number }>
): QuestionRecord[] {
  const progress = getProgress();
  return incorrectThisSession
    .map(q => progress[getQuestionKey(q.multiplier, q.multiplicand)])
    .filter(q => q && q.timesWrong > 0 && q.timesCorrect > 0);
}

export function saveSession(session: GameSession): void {
  try {
    const sessions = getSessions();
    sessions.push(session);
    // Keep only last 50 sessions
    const trimmed = sessions.slice(-50);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function getSessions(): GameSession[] {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getTotalStats(): { totalGames: number; totalCorrect: number; totalQuestions: number } {
  const sessions = getSessions();
  return {
    totalGames: sessions.length,
    totalCorrect: sessions.reduce((sum, s) => sum + s.score, 0),
    totalQuestions: sessions.reduce((sum, s) => sum + s.total, 0),
  };
}
