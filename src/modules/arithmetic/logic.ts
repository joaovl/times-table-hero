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

function digitsToRange(d: number): { min: number; max: number } {
  if (d <= 1) return { min: 0, max: 9 };
  return { min: 10 ** (d - 1), max: 10 ** d - 1 };
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickDigitCount(mode: DigitMode, cap: number): number {
  const target = Math.min(mode.digits, cap);
  if (mode.kind === 'exact') return target;
  return randInt(1, target);
}

function multiplyDigitPair(diff: Difficulty, cap: number): [number, number] {
  if (diff === 'easy') return [Math.min(1, cap), Math.min(1, cap)];
  if (diff === 'medium') return [Math.min(1, cap), Math.min(2, cap)];
  if (cap >= 2) return [2, Math.min(2, cap)];
  return [1, 1];
}

function trySample(settings: ArithSettings, op: 'add' | 'subtract' | 'multiply'): ArithQuestion | null {
  const { difficulty, digitMode } = settings;

  if (op === 'multiply') {
    const cap = Math.min(digitMode.digits, 3);
    const [d1, d2] = multiplyDigitPair(difficulty, cap);
    const r1 = digitsToRange(d1);
    const r2 = digitsToRange(d2);
    const a = randInt(r1.min, r1.max);
    const b = randInt(r2.min, r2.max);
    return { op: 'multiply', operand1: a, operand2: b, answer: a * b };
  }

  const d1 = pickDigitCount(digitMode, digitMode.digits);
  const d2 = pickDigitCount(digitMode, digitMode.digits);
  const r1 = digitsToRange(d1);
  const r2 = digitsToRange(d2);
  let a = randInt(r1.min, r1.max);
  let b = randInt(r2.min, r2.max);

  if (op === 'subtract' && a < b) [a, b] = [b, a];

  const carries = countCarries(a, b);
  const borrows = countBorrows(a, b);
  const matches =
    op === 'add'
      ? (difficulty === 'easy' ? carries === 0 : difficulty === 'medium' ? carries === 1 : carries >= 2)
      : (difficulty === 'easy' ? borrows === 0 : difficulty === 'medium' ? borrows === 1 : borrows >= 2);

  if (!matches) return null;

  return op === 'add'
    ? { op: 'add', operand1: a, operand2: b, answer: a + b }
    : { op: 'subtract', operand1: a, operand2: b, answer: a - b };
}

export function generateArithQuestions(settings: ArithSettings, count: number): ArithQuestion[] {
  const result: ArithQuestion[] = [];
  const concreteOps: Array<'add' | 'subtract' | 'multiply'> =
    settings.operation === 'all' ? ['add', 'subtract', 'multiply'] : [settings.operation];

  while (result.length < count) {
    const op = concreteOps[randInt(0, concreteOps.length - 1)];

    let q: ArithQuestion | null = null;
    for (let i = 0; i < 200 && q === null; i++) {
      q = trySample(settings, op);
    }

    if (!q) {
      const dm = settings.digitMode;
      const d = pickDigitCount(dm, dm.digits);
      const r = digitsToRange(d);
      const a = randInt(r.min, r.max);
      const b = randInt(r.min, r.max);
      if (op === 'add') q = { op, operand1: a, operand2: b, answer: a + b };
      else if (op === 'subtract') {
        const [hi, lo] = a >= b ? [a, b] : [b, a];
        q = { op: 'subtract', operand1: hi, operand2: lo, answer: hi - lo };
      } else {
        q = { op: 'multiply', operand1: a, operand2: b, answer: a * b };
      }
    }
    result.push(q);
  }

  return result;
}
