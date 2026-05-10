// Game logic utilities

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'questions' | 'time';
export type Operation = 'multiply' | 'divide' | 'square' | 'sqrt' | 'all';

export type BinaryOp = 'multiply' | 'divide';
export type UnaryOp = 'square' | 'sqrt';

export type BinaryQuestion = {
  kind: 'binary';
  op: BinaryOp;
  operand1: number;
  operand2: number;
  answer: number;
};

export type UnaryQuestion = {
  kind: 'unary';
  op: UnaryOp;
  operand: number;
  answer: number;
};

export type Question = BinaryQuestion | UnaryQuestion;

export interface GameSettings {
  tables: number[];
  difficulty: Difficulty;
  gameMode: GameMode;
  operation: Operation;
  questionCount: number;
  timeLimit: number; // in seconds
}

function buildPool(tables: number[], operation: Exclude<Operation, 'all'>): Question[] {
  const pool: Question[] = [];
  if (operation === 'multiply') {
    for (const t of tables) {
      for (let i = 0; i <= 12; i++) {
        pool.push({ kind: 'binary', op: 'multiply', operand1: t, operand2: i, answer: t * i });
      }
    }
  } else if (operation === 'divide') {
    for (const t of tables) {
      if (t === 0) continue;
      for (let i = 0; i <= 12; i++) {
        pool.push({ kind: 'binary', op: 'divide', operand1: t * i, operand2: t, answer: i });
      }
    }
  } else if (operation === 'square') {
    for (const t of tables) {
      pool.push({ kind: 'unary', op: 'square', operand: t, answer: t * t });
    }
  } else if (operation === 'sqrt') {
    for (const t of tables) {
      pool.push({ kind: 'unary', op: 'sqrt', operand: t * t, answer: t });
    }
  }
  return pool;
}

function sampleFromPool(pool: Question[], n: number): Question[] {
  if (pool.length === 0 || n <= 0) return [];
  const out: Question[] = [];
  let shuffled = [...pool].sort(() => Math.random() - 0.5);
  while (out.length < n) {
    const need = n - out.length;
    out.push(...shuffled.slice(0, Math.min(need, shuffled.length)));
    if (out.length < n) shuffled = [...pool].sort(() => Math.random() - 0.5);
  }
  return out.slice(0, n);
}

export function generateQuestions(
  tables: number[],
  count: number,
  operation: Operation
): Question[] {
  const concreteOps: Exclude<Operation, 'all'>[] =
    operation === 'all' ? ['multiply', 'divide', 'square', 'sqrt'] : [operation];

  const opsWithPools = concreteOps
    .map(op => ({ op, pool: buildPool(tables, op) }))
    .filter(x => x.pool.length > 0);

  if (opsWithPools.length === 0) return [];

  const k = opsWithPools.length;
  const perOp = Math.floor(count / k);
  const remainder = count - perOp * k;

  const result: Question[] = [];
  opsWithPools.forEach(({ pool }, idx) => {
    const target = perOp + (idx < remainder ? 1 : 0);
    result.push(...sampleFromPool(pool, target));
  });

  result.sort(() => Math.random() - 0.5);
  return result;
}

export function generateWrongAnswers(
  correctAnswer: number,
  difficulty: Difficulty
): number[] {
  const wrongAnswers: Set<number> = new Set();

  if (difficulty === 'easy') {
    // Wrong answers are noticeably different (±5 to ±20)
    while (wrongAnswers.size < 2) {
      const offset = Math.floor(Math.random() * 16) + 5;
      const sign = Math.random() > 0.5 ? 1 : -1;
      let wrong = correctAnswer + (offset * sign);

      // Ensure wrong answer is non-negative and different from correct
      if (wrong < 0) {
        wrong = correctAnswer + offset; // Force positive offset if negative
      }

      if (wrong !== correctAnswer && wrong >= 0) {
        wrongAnswers.add(wrong);
      }
    }
  } else if (difficulty === 'medium') {
    // Wrong answers within ±2
    const possibleWrong = [
      correctAnswer - 2,
      correctAnswer - 1,
      correctAnswer + 1,
      correctAnswer + 2,
    ].filter(n => n >= 0 && n !== correctAnswer);

    while (wrongAnswers.size < 2 && possibleWrong.length > 0) {
      const idx = Math.floor(Math.random() * possibleWrong.length);
      wrongAnswers.add(possibleWrong[idx]);
      possibleWrong.splice(idx, 1);
    }

    // Fallback if not enough close answers
    while (wrongAnswers.size < 2) {
      const offset = Math.floor(Math.random() * 3) + 3;
      const sign = Math.random() > 0.5 ? 1 : -1;
      let wrong = correctAnswer + (offset * sign);

      // Ensure wrong answer is non-negative and different from correct
      if (wrong < 0) {
        wrong = correctAnswer + offset; // Force positive offset if negative
      }

      if (wrong !== correctAnswer && wrong >= 0) {
        wrongAnswers.add(wrong);
      }
    }
  }

  return Array.from(wrongAnswers);
}

export function shuffleOptions(correct: number, wrong: number[]): number[] {
  const options = [correct, ...wrong];
  return options.sort(() => Math.random() - 0.5);
}

export const POSITIVE_MESSAGES = [
  "Brilliant!",
  "Well done!",
  "Fantastic!",
  "Superb!",
  "Amazing!",
  "You're a star!",
  "Excellent!",
  "Marvellous!",
  "Top marks!",
  "Spot on!",
];

export function getRandomPositiveMessage(): string {
  return POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
}

