export type ArithOp = 'add' | 'subtract' | 'multiply' | 'all';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DigitMode =
  | { kind: 'exact'; digits: number }
  | { kind: 'upTo'; digits: number };

export type MultiplyLevel = 'facts' | 'd2x1' | 'd2x2' | 'd3x1' | 'd3x2' | 'd4x1' | 'd5x1';

export const MULTIPLY_LEVELS: MultiplyLevel[] = ['facts', 'd2x1', 'd2x2', 'd3x1', 'd3x2', 'd4x1', 'd5x1'];

export const MULTIPLY_LEVEL_LABEL: Record<MultiplyLevel, string> = {
  facts: '×1d',
  d2x1: '2×1',
  d2x2: '2×2',
  d3x1: '3×1',
  d3x2: '3×2',
  d4x1: '4×1',
  d5x1: '5×1',
};

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
  multiplyLevel: MultiplyLevel;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// Difficulty thresholds scale with operand digit count: a "hard" 5-digit add
// requires more carries than a "hard" 2-digit add, otherwise hard at high
// digit counts can still come out unchallenging.
function carryThresholds(digits: number): { easyMax: number; mediumMax: number } {
  // easy: 0 carries
  // medium: 1..ceil(digits/3) carries
  // hard: > ceil(digits/3) carries
  return { easyMax: 0, mediumMax: Math.max(1, Math.ceil(digits / 3)) };
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

// Multiplication uses an explicit level-based picker rather than the
// digit/difficulty knobs that govern add/subtract. This decouples kid
// progression (which is naturally a sequence) from the rest of the form.
function multiplyLevelToDigitPair(level: MultiplyLevel): [number, number] {
  switch (level) {
    case 'facts': return [1, 1];
    case 'd2x1':  return [2, 1];
    case 'd2x2':  return [2, 2];
    case 'd3x1':  return [3, 1];
    case 'd3x2':  return [3, 2];
    case 'd4x1':  return [4, 1];
    case 'd5x1':  return [5, 1];
  }
}

function trySample(settings: ArithSettings, op: 'add' | 'subtract' | 'multiply'): ArithQuestion | null {
  const { difficulty, digitMode, multiplyLevel } = settings;

  if (op === 'multiply') {
    const [d1, d2] = multiplyLevelToDigitPair(multiplyLevel);
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
  const widerDigits = Math.max(String(a).length, String(b).length);
  const { easyMax, mediumMax } = carryThresholds(widerDigits);

  const matches =
    op === 'add'
      ? (difficulty === 'easy'
          ? carries <= easyMax
          : difficulty === 'medium'
            ? carries >= 1 && carries <= mediumMax
            : carries > mediumMax)
      : (difficulty === 'easy'
          ? borrows <= easyMax
          : difficulty === 'medium'
            ? borrows >= 1 && borrows <= mediumMax
            : borrows > mediumMax);

  if (!matches) return null;

  return op === 'add'
    ? { op: 'add', operand1: a, operand2: b, answer: a + b }
    : { op: 'subtract', operand1: a, operand2: b, answer: a - b };
}

function sampleOne(
  settings: ArithSettings,
  op: 'add' | 'subtract' | 'multiply'
): ArithQuestion {
  let q: ArithQuestion | null = null;
  for (let i = 0; i < 200 && q === null; i++) {
    q = trySample(settings, op);
  }
  if (q) return q;

  // Fallback: sample for the same op without difficulty filter.
  const dm = settings.digitMode;
  const d = pickDigitCount(dm, dm.digits);
  const r = digitsToRange(d);
  const a = randInt(r.min, r.max);
  const b = randInt(r.min, r.max);
  if (op === 'add') return { op, operand1: a, operand2: b, answer: a + b };
  if (op === 'subtract') {
    const [hi, lo] = a >= b ? [a, b] : [b, a];
    return { op: 'subtract', operand1: hi, operand2: lo, answer: hi - lo };
  }
  return { op: 'multiply', operand1: a, operand2: b, answer: a * b };
}

export function generateArithQuestions(settings: ArithSettings, count: number): ArithQuestion[] {
  const concreteOps: Array<'add' | 'subtract' | 'multiply'> =
    settings.operation === 'all' ? ['add', 'subtract', 'multiply'] : [settings.operation];

  const k = concreteOps.length;
  const perOp = Math.floor(count / k);
  const remainder = count - perOp * k;

  const result: ArithQuestion[] = [];
  concreteOps.forEach((op, idx) => {
    const target = perOp + (idx < remainder ? 1 : 0);
    for (let n = 0; n < target; n++) {
      result.push(sampleOne(settings, op));
    }
  });

  // Final shuffle so ops are interleaved, not grouped by op.
  result.sort(() => Math.random() - 0.5);
  return result;
}
