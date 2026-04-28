// Game logic utilities

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'questions' | 'time';
export type Operation = 'multiply' | 'divide' | 'both';

export interface Question {
  operand1: number;
  operand2: number;
  answer: number;
  operation: 'multiply' | 'divide';
}

export interface GameSettings {
  tables: number[];
  difficulty: Difficulty;
  gameMode: GameMode;
  operation: Operation;
  questionCount: number;
  timeLimit: number; // in seconds
}

export function generateQuestions(
  tables: number[],
  count: number,
  operation: Operation
): Question[] {
  const allQuestions: Question[] = [];

  // Generate all possible questions for selected tables
  for (const table of tables) {
    for (let i = 0; i <= 12; i++) {
      // Multiplication: table × i = answer
      if (operation === 'multiply' || operation === 'both') {
        allQuestions.push({
          operand1: table,
          operand2: i,
          answer: table * i,
          operation: 'multiply',
        });
      }

      // Division: (table × i) ÷ table = i
      // Skip division by zero
      if ((operation === 'divide' || operation === 'both') && table !== 0) {
        allQuestions.push({
          operand1: table * i,
          operand2: table,
          answer: i,
          operation: 'divide',
        });
      }
    }
  }

  // Shuffle and take required count
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);

  // If we need more questions than available, cycle through
  const result: Question[] = [];
  while (result.length < count) {
    const remaining = count - result.length;
    result.push(...shuffled.slice(0, Math.min(remaining, shuffled.length)));
    shuffled.sort(() => Math.random() - 0.5); // Re-shuffle for variety
  }

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

