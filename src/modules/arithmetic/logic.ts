// Division generator follows the standard exact-division-by-construction
// pattern (e.g. abakhru/math-worksheet-generator): pick divisor and quotient
// in the requested digit-count ranges, multiply to get the dividend. When
// remainders are allowed we instead pick dividend and divisor directly and
// take floor(a/b) / a%b.

import { integerChoices, numericChoicesWithNone } from '@/lib/game/choices';

export type ArithOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'all';
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

export function divideExample(firstDigits: number[], secondDigits: number[]): string {
  return `${sampleFor(firstDigits)} ÷ ${sampleFor(secondDigits)}`;
}

export interface ArithQuestion {
  op: 'add' | 'subtract' | 'multiply' | 'divide';
  operand1: number;
  operand2: number;
  answer: number;
  // Optional non-zero remainder for divide questions. Omitted (or zero) means
  // exact division.
  remainder?: number;
}

// Whether a divide question is rendered with a separate remainder input field
// in online play (i.e. has a remainder slot the kid is expected to fill in).
// True only for divide questions whose generated remainder is > 0; exact
// divisions render with a single quotient input.
export function divideUsesRemainderField(q: ArithQuestion): boolean {
  return q.op === 'divide' && (q.remainder ?? 0) > 0;
}

// Compare a kid's typed answer to the expected one. For divide questions with
// a remainder slot, both the quotient and the remainder must match (an empty
// remainder field is treated as 0). For everything else, only the first
// argument is consulted — `remainderInput` is ignored.
//
// `quotientInput` and `remainderInput` are the already-parsed numbers from the
// input fields, or `null` if the field was empty / unparseable.
export function checkArithAnswer(
  q: ArithQuestion,
  quotientInput: number | null,
  remainderInput: number | null
): boolean {
  if (divideUsesRemainderField(q)) {
    const expectedRemainder = q.remainder ?? 0;
    const actualRemainder = remainderInput ?? 0;
    return quotientInput === q.answer && actualRemainder === expectedRemainder;
  }
  return quotientInput === q.answer;
}

// Multiple-choice options for easy/medium (typed on hard). Answers are lone
// integers except remainder divisions ("2 r 3", two fields), which return []
// so the caller falls back to typed input. Medium adds a 'None of these' button
// that is correct when `hideCorrect` hides the true answer.
export function generateArithChoices(
  q: ArithQuestion,
  difficulty: Difficulty,
  hideCorrect = false,
): string[] {
  if (divideUsesRemainderField(q)) return [];
  const isWrong = (c: string) => !checkArithAnswer(q, Number(c), null);
  if (difficulty === 'easy') return integerChoices(q.answer, 'easy', isWrong);
  return numericChoicesWithNone(q.answer, isWrong, String, hideCorrect);
}

export interface ArithSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  addSubFirstDigits: number[];   // non-empty subset of [1..5]
  addSubSecondDigits: number[];  // non-empty subset of [1..5]
  multiplyFirstDigits: number[]; // non-empty subset of [1..5]
  multiplySecondDigits: number[];// non-empty subset of [1..5]
  divideFirstDigits: number[];   // dividend digit-count set; non-empty subset of [1..5]
  divideSecondDigits: number[];  // divisor digit-count set; non-empty subset of [1..5]
  allowRemainders: boolean;
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

// Build a divide question. Two modes:
//   - exact (allowRemainders=false): pick divisor b in the divisor-digit
//     range, pick quotient q in the dividend-digit range, set a = b*q. This
//     guarantees a clean division. The dividend digit count is set by
//     `divideFirstDigits` (treated as "dividend size"); when b > 1 the
//     product b*q may exceed the requested digit count, so we clamp q's
//     range so that a has the right number of digits.
//   - with remainders (allowRemainders=true): pick dividend a in
//     divideFirstDigits-range, divisor b in divideSecondDigits-range (b > 0
//     and a >= b), answer = floor(a/b), remainder = a%b.
function buildDivide(settings: ArithSettings): ArithQuestion | null {
  const d1 = pickFromSet(settings.divideFirstDigits);  // dividend digits
  const d2 = pickFromSet(settings.divideSecondDigits); // divisor digits
  const r1 = digitsToRange(d1);
  const r2 = digitsToRange(d2);

  if (settings.allowRemainders) {
    // Direct sample. Require a >= b so quotient >= 1, otherwise the kid
    // would be staring at "3 ÷ 8 = 0 r 3" which isn't pedagogically useful.
    const bMin = Math.max(1, r2.min); // divisor never zero
    const bMax = r2.max;
    if (bMax < 1) return null;
    const b = randInt(bMin, bMax);
    const aMin = Math.max(r1.min, b); // ensure a >= b
    if (aMin > r1.max) return null;
    const a = randInt(aMin, r1.max);
    const answer = Math.floor(a / b);
    const remainder = a % b;
    const q: ArithQuestion = { op: 'divide', operand1: a, operand2: b, answer };
    if (remainder !== 0) q.remainder = remainder;
    return q;
  }

  // Exact-by-construction. Pick divisor b first, then choose quotient q so
  // that a = b * q lands in the dividend digit range.
  const bMin = Math.max(1, r2.min);
  const bMax = r2.max;
  if (bMax < 1) return null;
  const b = randInt(bMin, bMax);

  // q must satisfy r1.min <= b*q <= r1.max, and also r1.min <= a (since the
  // dividend is required to have d1 digits). Use ceil/floor to clamp.
  // q must also be >= 1 so we get a non-trivial division.
  const qMin = Math.max(1, Math.ceil(r1.min / b));
  const qMax = Math.floor(r1.max / b);
  if (qMin > qMax) return null;
  const quotient = randInt(qMin, qMax);
  const a = b * quotient;
  return { op: 'divide', operand1: a, operand2: b, answer: quotient };
}


function trySample(settings: ArithSettings, op: 'add' | 'subtract' | 'multiply' | 'divide'): ArithQuestion | null {
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

  if (op === 'divide') {
    return buildDivide(settings);
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
  op: 'add' | 'subtract' | 'multiply' | 'divide'
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

  if (op === 'divide') {
    // Final fallback: pick a dividend in the requested range and divide by
    // 1 — always correct, just not very interesting.
    const d1 = pickFromSet(settings.divideFirstDigits);
    const r1 = digitsToRange(d1);
    const a = randInt(Math.max(1, r1.min), r1.max);
    return { op: 'divide', operand1: a, operand2: 1, answer: a };
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
  const concreteOps: Array<'add' | 'subtract' | 'multiply' | 'divide'> =
    settings.operation === 'all' ? ['add', 'subtract', 'multiply', 'divide'] : [settings.operation];

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
