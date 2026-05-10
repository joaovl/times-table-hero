export type ArithOp = 'add' | 'subtract' | 'multiply' | 'all';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DigitMode =
  | { kind: 'exact'; digits: number }
  | { kind: 'upTo'; digits: number };

export interface ArithQuestion {
  op: 'add' | 'subtract' | 'multiply';
  operand1: number;
  operand2: number;
  answer: number;
}

export interface ArithSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export function countCarries(a: number, b: number): number {
  let av = a, bv = b, carry = 0, carries = 0;
  while (av > 0 || bv > 0 || carry > 0) {
    const sum = (av % 10) + (bv % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry) carries++;
    av = Math.floor(av / 10);
    bv = Math.floor(bv / 10);
  }
  return carries;
}

export function countBorrows(a: number, b: number): number {
  let av = a, bv = b, borrows = 0, borrowFromNext = 0;
  while (av > 0 || bv > 0) {
    const ad = (av % 10) - borrowFromNext;
    const bd = bv % 10;
    if (ad < bd) {
      borrows++;
      borrowFromNext = 1;
    } else {
      borrowFromNext = 0;
    }
    av = Math.floor(av / 10);
    bv = Math.floor(bv / 10);
  }
  return borrows;
}
