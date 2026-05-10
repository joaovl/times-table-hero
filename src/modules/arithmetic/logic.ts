export type ArithOp = 'add' | 'subtract' | 'multiply' | 'all';
export type Difficulty = 'easy' | 'medium' | 'hard';

// Operands are configured by independent multi-select chip pickers (one per
// operand). Each picker holds a non-empty subset of [1..5] meaning "the
// allowed digit-counts for this operand". e.g. addSubFirstDigits=[1,2,3]
// means "operand1 may be 1, 2, or 3 digits, picked uniformly at random".
export const MULTIPLY_DIGIT_OPTIONS = [1, 2, 3, 4, 5] as const;

const DIGIT_SAMPLE: Record<number, string> = {
  1: '7',
  2: '23',
  3: '234',
  4: '1234',
  5: '12345',
};

function sampleFor(set: number[]): string {
  const d = set[0];
  return DIGIT_SAMPLE[d] ?? '?';
}

export function multiplyExample(firstDigits: number[], secondDigits: number[]): string {
  return `${sampleFor(firstDigits)} × ${sampleFor(secondDigits)}`;
}

export function addSubExample(firstDigits: number[], secondDigits: number[], op: 'add' | 'subtract'): string {
  const sym = op === 'add' ? '+' : '−';
  return `${sampleFor(firstDigits)} ${sym} ${sampleFor(secondDigits)}`;
}

export interface ArithQuestion {
  op: 'add' | 'subtract' | 'multiply';
  operand1: number;
  operand2: number;
  answer: number;
}

export interface ArithSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  addSubFirstDigits: number[];   // non-empty subset of [1..5]
  addSubSecondDigits: number[];  // non-empty subset of [1..5]
  multiplyFirstDigits: number[]; // non-empty subset of [1..5]
  multiplySecondDigits: number[];// non-empty subset of [1..5]
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

function pickFromSet(set: number[]): number {
  // Caller guarantees non-empty; fall back defensively.
  if (!set || set.length === 0) return 1;
  return set[Math.floor(Math.random() * set.length)];
}


function trySample(settings: ArithSettings, op: 'add' | 'subtract' | 'multiply'): ArithQuestion | null {
  const {
    difficulty,
    addSubFirstDigits,
    addSubSecondDigits,
    multiplyFirstDigits,
    multiplySecondDigits,
  } = settings;

  if (op === 'multiply') {
    const d1 = pickFromSet(multiplyFirstDigits);
    const d2 = pickFromSet(multiplySecondDigits);
    const r1 = digitsToRange(d1);
    const r2 = digitsToRange(d2);
    const a = randInt(r1.min, r1.max);
    const b = randInt(r2.min, r2.max);
    return { op: 'multiply', operand1: a, operand2: b, answer: a * b };
  }

  const d1 = pickFromSet(addSubFirstDigits);
  const d2 = pickFromSet(addSubSecondDigits);
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

  // Fallback: sample for the same op without difficulty filter, using the
  // same digit-set semantics.
  if (op === 'multiply') {
    const d1 = pickFromSet(settings.multiplyFirstDigits);
    const d2 = pickFromSet(settings.multiplySecondDigits);
    const r1 = digitsToRange(d1);
    const r2 = digitsToRange(d2);
    const a = randInt(r1.min, r1.max);
    const b = randInt(r2.min, r2.max);
    return { op: 'multiply', operand1: a, operand2: b, answer: a * b };
  }

  const d1 = pickFromSet(settings.addSubFirstDigits);
  const d2 = pickFromSet(settings.addSubSecondDigits);
  const r1 = digitsToRange(d1);
  const r2 = digitsToRange(d2);
  const a = randInt(r1.min, r1.max);
  const b = randInt(r2.min, r2.max);
  if (op === 'add') return { op, operand1: a, operand2: b, answer: a + b };
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return { op: 'subtract', operand1: hi, operand2: lo, answer: hi - lo };
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
