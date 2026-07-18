// Number Sense module: skills covering UK National Curriculum Years 3–6.
// Place value, rounding, multiples sequences, negative number counting,
// Roman numerals, ordering, plus Y6 additions: place value to 10,000,000,
// rounding to 1,000,000, negative-interval (count-across-zero) and BIDMAS
// order-of-operations. All generators use Math.random() with no external
// dependencies.

import { integerChoices } from '@/lib/game/choices';
import { t, type MessageKey } from '@/lib/i18n/i18n';

export type NumberSenseSkill =
  | 'place-value-3d'
  | 'place-value-4d'
  | 'place-value-7d'
  | 'place-value-10m'
  | 'round-10'
  | 'round-100'
  | 'round-1000'
  | 'round-10k'
  | 'round-1m'
  | 'count-multiples'
  | 'negative-count'
  | 'negative-interval'
  | 'roman-100'
  | 'roman-1000'
  | 'order-numbers'
  | 'bidmas';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Place-value questions: show a number, point at a digit position, ask the
// kid to type its place value as a number (e.g. "the 7 in 374" → 70).
// digitIndex is 0-based from the LEFT (most significant first); answer is
// always the digit times its positional weight.
export interface NumberSensePlaceValueQuestion {
  skill: 'place-value-3d' | 'place-value-4d' | 'place-value-7d' | 'place-value-10m';
  number: number;
  digitIndex: number;
  answer: number;
}

export interface NumberSenseRoundQuestion {
  skill: 'round-10' | 'round-100' | 'round-1000' | 'round-10k' | 'round-1m';
  number: number;
  nearest: number; // 10, 100, 1000, 10000, 100000, 1000000
  answer: number;
}

// negative-interval: "From -5 to 12, how many?" → 17 (the distance between
// the two endpoints, always positive).
export interface NumberSenseNegativeIntervalQuestion {
  skill: 'negative-interval';
  from: number;
  to: number;
  answer: number; // always = to - from, taken as |to - from|
}

// bidmas: a small order-of-operations expression. The expression is stored
// as a printable string (PDF-safe glyphs only) plus the canonical numeric
// answer; for safety we also pin the structured operand tuple so the test
// can recompute the expected value without parsing.
export interface NumberSenseBidmasQuestion {
  skill: 'bidmas';
  /** Pretty-printed expression e.g. "2 + 3 × 4". WinAnsi-safe characters
   *  only ('+', '-', '×', '÷', '(', ')', digits, spaces). */
  expression: string;
  answer: number;
}

// Sequence skills (multiples + negative counting): show a sequence with one
// or more blank entries; kid fills in every blank in order.
export interface NumberSenseSequenceQuestion {
  skill: 'count-multiples' | 'negative-count';
  sequence: number[];
  missingIndices: number[];
  answers: number[]; // one entry per missingIndex, in order
  step: number;
}

// Roman numeral conversion: direction 'r2n' shows a Roman numeral, asks for
// the integer; 'n2r' shows the integer, asks for the Roman numeral.
export interface NumberSenseRomanQuestion {
  skill: 'roman-100' | 'roman-1000';
  direction: 'r2n' | 'n2r';
  prompt: string;
  answer: string; // numeric digits or canonical Roman numeral (uppercase)
}

// Order four numbers smallest → largest. Kid types comma-separated; the
// validator compares the parsed list to `answer`.
export interface NumberSenseOrderQuestion {
  skill: 'order-numbers';
  numbers: number[];
  answer: number[]; // numbers sorted ascending
}

export type NumberSenseQuestion =
  | NumberSensePlaceValueQuestion
  | NumberSenseRoundQuestion
  | NumberSenseSequenceQuestion
  | NumberSenseRomanQuestion
  | NumberSenseOrderQuestion
  | NumberSenseNegativeIntervalQuestion
  | NumberSenseBidmasQuestion;

export interface NumberSenseSettings {
  skills: NumberSenseSkill[];
  difficulty: Difficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: NumberSenseSkill[] = [
  'place-value-3d',
  'place-value-4d',
  'place-value-7d',
  'place-value-10m',
  'round-10',
  'round-100',
  'round-1000',
  'round-10k',
  'round-1m',
  'count-multiples',
  'negative-count',
  'negative-interval',
  'roman-100',
  'roman-1000',
  'order-numbers',
  'bidmas',
];

// Kept English-only: consumed by printConfig.ts/pdf.ts for the printed
// worksheet, which is out of scope for this extraction pass.
export const SKILL_LABELS: Record<NumberSenseSkill, string> = {
  'place-value-3d': 'Place value (3-digit)',
  'place-value-4d': 'Place value (4-digit)',
  'place-value-7d': 'Place value (to 1M)',
  'place-value-10m': 'Place value (to 10M)',
  'round-10': 'Round to 10',
  'round-100': 'Round to 100',
  'round-1000': 'Round to 1,000',
  'round-10k': 'Round to 10k/100k',
  'round-1m': 'Round to 1,000,000',
  'count-multiples': 'Count in multiples',
  'negative-count': 'Negative counting',
  'negative-interval': 'Negative interval',
  'roman-100': 'Roman to 100',
  'roman-1000': 'Roman to 1000',
  'order-numbers': 'Order numbers',
  'bidmas': 'Order of operations',
};

const SKILL_KEY: Record<NumberSenseSkill, MessageKey> = {
  'place-value-3d': 'numberSense.skills.placeValue3d',
  'place-value-4d': 'numberSense.skills.placeValue4d',
  'place-value-7d': 'numberSense.skills.placeValue7d',
  'place-value-10m': 'numberSense.skills.placeValue10m',
  'round-10': 'numberSense.skills.round10',
  'round-100': 'numberSense.skills.round100',
  'round-1000': 'numberSense.skills.round1000',
  'round-10k': 'numberSense.skills.round10k',
  'round-1m': 'numberSense.skills.round1m',
  'count-multiples': 'numberSense.skills.countMultiples',
  'negative-count': 'numberSense.skills.negativeCount',
  'negative-interval': 'numberSense.skills.negativeInterval',
  'roman-100': 'numberSense.skills.roman100',
  'roman-1000': 'numberSense.skills.roman1000',
  'order-numbers': 'numberSense.skills.orderNumbers',
  'bidmas': 'numberSense.skills.bidmas',
};

export function skillLabel(s: NumberSenseSkill): string {
  return t(SKILL_KEY[s]);
}

// Curriculum tag map — exported so an orchestrator can build a curriculum
// reference doc without having to re-implement the mapping.
export const CURRICULUM_TAGS: Record<
  NumberSenseSkill,
  { year: 3 | 4 | 5 | 6; objective: string }[]
> = {
  'place-value-3d': [
    { year: 3, objective: 'Recognise the place value of each digit in a 3-digit number' },
  ],
  'place-value-4d': [
    { year: 4, objective: 'Recognise the place value of each digit in a 4-digit number' },
  ],
  'place-value-7d': [
    {
      year: 5,
      objective:
        'Read, write, order and compare numbers to at least 1,000,000 and determine the value of each digit',
    },
  ],
  'place-value-10m': [
    {
      year: 6,
      objective:
        'Read, write, order and compare numbers up to 10,000,000 and determine the value of each digit',
    },
  ],
  'round-10': [
    { year: 4, objective: 'Round any number to the nearest 10' },
  ],
  'round-100': [
    { year: 4, objective: 'Round any number to the nearest 100' },
  ],
  'round-1000': [
    { year: 4, objective: 'Round any number to the nearest 1,000' },
  ],
  'round-10k': [
    {
      year: 5,
      objective: 'Round any number up to 1,000,000 to the nearest 10,000 and 100,000',
    },
  ],
  'round-1m': [
    {
      year: 6,
      objective: 'Round any whole number to a required degree of accuracy (nearest 1,000,000)',
    },
  ],
  'count-multiples': [
    { year: 3, objective: 'Count from 0 in multiples of 4, 8, 50 and 100' },
    { year: 4, objective: 'Count in multiples of 6, 7, 9, 25 and 1000' },
    { year: 5, objective: 'Count forwards or backwards in steps of powers of 10' },
  ],
  'negative-count': [
    {
      year: 4,
      objective:
        'Count backwards through zero to include negative numbers',
    },
  ],
  'negative-interval': [
    {
      year: 6,
      objective: 'Use negative numbers in context and calculate intervals across zero',
    },
  ],
  'roman-100': [
    {
      year: 4,
      objective: 'Read Roman numerals to 100 (I to C)',
    },
  ],
  'roman-1000': [
    {
      year: 5,
      objective: 'Read Roman numerals to 1000 (M); recognise years written in Roman numerals',
    },
  ],
  'order-numbers': [
    { year: 3, objective: 'Compare and order numbers up to 1,000' },
    { year: 4, objective: 'Order and compare numbers beyond 1,000' },
    { year: 5, objective: 'Order and compare numbers to at least 1,000,000' },
  ],
  'bidmas': [
    {
      year: 6,
      objective: 'Use knowledge of the order of operations (BIDMAS/BODMAS) to carry out calculations involving the four operations',
    },
  ],
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Roman numeral helpers ----------
// Standard subtractive form (CM, CD, XC, XL, IX, IV).

const ROMAN_PAIRS: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return '';
  let remaining = n;
  let out = '';
  for (const [value, glyph] of ROMAN_PAIRS) {
    while (remaining >= value) {
      out += glyph;
      remaining -= value;
    }
  }
  return out;
}

// Parse a Roman numeral string (case-insensitive). Returns NaN if the
// string contains non-Roman characters. Accepts standard subtractive form;
// also tolerates a leading/trailing whitespace.
export function fromRoman(s: string): number {
  const trimmed = s.trim().toUpperCase();
  if (trimmed.length === 0) return NaN;
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  for (const ch of trimmed) {
    if (!(ch in map)) return NaN;
  }
  let total = 0;
  let prev = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const v = map[trimmed[i]];
    if (v < prev) total -= v;
    else total += v;
    prev = v;
  }
  return total;
}

// ---------- Place value ----------

function buildPlaceValue(
  skill: 'place-value-3d' | 'place-value-4d' | 'place-value-7d' | 'place-value-10m'
): NumberSensePlaceValueQuestion {
  let digits: number;
  if (skill === 'place-value-3d') digits = 3;
  else if (skill === 'place-value-4d') digits = 4;
  else if (skill === 'place-value-7d') digits = randInt(5, 7); // up to 1,000,000 (7 digits)
  else digits = randInt(7, 8); // place-value-10m: up to 10,000,000 (8 digits)

  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const number = randInt(min, max);
  // Pick a random digit index (0-based from the left). Avoid choosing a
  // position whose digit is 0 in the picked number — "the value of the 0
  // in 304" is technically valid but reads awkwardly to a Y3.
  const numStr = String(number);
  const candidates: number[] = [];
  for (let i = 0; i < numStr.length; i++) {
    if (numStr[i] !== '0') candidates.push(i);
  }
  // If every digit but the first is 0 (very rare), fall back to digit 0.
  const digitIndex = candidates.length > 0 ? pickFrom(candidates) : 0;
  const digit = parseInt(numStr[digitIndex], 10);
  const positionFromRight = numStr.length - 1 - digitIndex;
  const answer = digit * 10 ** positionFromRight;
  return { skill, number, digitIndex, answer };
}

// ---------- Rounding ----------

function nearestFor(skill: NumberSenseRoundQuestion['skill']): number {
  if (skill === 'round-10') return 10;
  if (skill === 'round-100') return 100;
  if (skill === 'round-1000') return 1000;
  if (skill === 'round-1m') return 1000000;
  // round-10k: alternate between 10,000 and 100,000.
  return Math.random() < 0.5 ? 10000 : 100000;
}

function rangeFor(nearest: number, difficulty: Difficulty): { min: number; max: number } {
  // Range scales with `nearest` so questions feel matched to the place
  // value being rounded. Difficulty adjusts the range; harder draws span a
  // wider, less obvious magnitude.
  if (nearest === 10) {
    if (difficulty === 'easy') return { min: 11, max: 99 };
    if (difficulty === 'medium') return { min: 11, max: 999 };
    return { min: 11, max: 9999 };
  }
  if (nearest === 100) {
    if (difficulty === 'easy') return { min: 101, max: 999 };
    if (difficulty === 'medium') return { min: 101, max: 9999 };
    return { min: 101, max: 99999 };
  }
  if (nearest === 1000) {
    if (difficulty === 'easy') return { min: 1001, max: 9999 };
    if (difficulty === 'medium') return { min: 1001, max: 99999 };
    return { min: 1001, max: 999999 };
  }
  // 10k or 100k
  if (nearest === 10000) {
    if (difficulty === 'easy') return { min: 10001, max: 99999 };
    if (difficulty === 'medium') return { min: 10001, max: 999999 };
    return { min: 10001, max: 9999999 };
  }
  if (nearest === 100000) {
    if (difficulty === 'easy') return { min: 100001, max: 999999 };
    if (difficulty === 'medium') return { min: 100001, max: 9999999 };
    return { min: 100001, max: 99999999 };
  }
  // 1,000,000 — Y6 "round to the nearest million" target.
  if (difficulty === 'easy') return { min: 1000001, max: 9999999 };
  if (difficulty === 'medium') return { min: 1000001, max: 99999999 };
  return { min: 1000001, max: 999999999 };
}

function roundToNearest(n: number, nearest: number): number {
  return Math.round(n / nearest) * nearest;
}

function buildRound(skill: NumberSenseRoundQuestion['skill'], difficulty: Difficulty): NumberSenseRoundQuestion {
  const nearest = nearestFor(skill);
  const { min, max } = rangeFor(nearest, difficulty);
  let number = randInt(min, max);
  // Avoid emitting a question whose answer equals the number (boring).
  for (let i = 0; i < 8 && number % nearest === 0; i++) {
    number = randInt(min, max);
  }
  const answer = roundToNearest(number, nearest);
  return { skill, number, nearest, answer };
}

// ---------- Sequences ----------

// Y3: 4, 8, 50, 100. Y4: 6, 7, 9, 25, 1000. Y5: powers of 10.
const MULTIPLE_STEPS_BY_YEAR: Record<3 | 4 | 5, number[]> = {
  3: [4, 8, 50, 100],
  4: [6, 7, 9, 25, 1000],
  5: [10, 100, 1000, 10000, 100000, 1000000],
};

function buildMultiples(difficulty: Difficulty): NumberSenseSequenceQuestion {
  // Difficulty roughly maps to year: easy = Y3, medium = Y4, hard = Y5.
  const year: 3 | 4 | 5 = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const step = pickFrom(MULTIPLE_STEPS_BY_YEAR[year]);
  // Sequence length is fixed at 6 so the layout is consistent.
  const length = 6;
  // Start somewhere reasonable — for big steps start at 0 to keep numbers
  // sane; for small steps start mid-range so it's not always "step × i".
  let start: number;
  if (step >= 1000) {
    start = 0;
  } else {
    // Random starting multiple between 1 and 6.
    start = step * randInt(1, 6);
  }
  const sequence = Array.from({ length }, (_, i) => start + i * step);
  // Pick 2-3 blank indices, never the first one (kid needs the pattern start).
  const blanks = difficulty === 'hard' ? 3 : 2;
  const indices = new Set<number>();
  while (indices.size < blanks) {
    indices.add(randInt(1, length - 1));
  }
  const missingIndices = Array.from(indices).sort((a, b) => a - b);
  const answers = missingIndices.map(i => sequence[i]);
  return { skill: 'count-multiples', sequence, missingIndices, answers, step };
}

function buildNegativeCount(difficulty: Difficulty): NumberSenseSequenceQuestion {
  // Step always negative so the sequence crosses zero. Easy = step 1 or 2,
  // medium = up to 5, hard = up to 10.
  const stepMag = difficulty === 'easy' ? randInt(1, 2) : difficulty === 'medium' ? randInt(2, 5) : randInt(3, 10);
  const step = -stepMag;
  const length = 6;
  // Start positive enough that the sequence crosses zero.
  const start = stepMag * randInt(2, 4) + randInt(0, stepMag - 1);
  const sequence = Array.from({ length }, (_, i) => start + i * step);
  const blanks = difficulty === 'hard' ? 3 : 2;
  const indices = new Set<number>();
  while (indices.size < blanks) {
    indices.add(randInt(1, length - 1));
  }
  const missingIndices = Array.from(indices).sort((a, b) => a - b);
  const answers = missingIndices.map(i => sequence[i]);
  return { skill: 'negative-count', sequence, missingIndices, answers, step };
}

// ---------- Roman numerals ----------

function buildRoman(skill: 'roman-100' | 'roman-1000', difficulty: Difficulty): NumberSenseRomanQuestion {
  const max = skill === 'roman-100' ? 100 : 1000;
  // Easier picks bias toward "clean" values that map to a single Roman glyph
  // or a short combination; harder picks span the full range.
  let n: number;
  if (difficulty === 'easy') {
    // Stay in the lower half of the range.
    n = randInt(1, Math.max(2, Math.floor(max / 2)));
  } else if (difficulty === 'medium') {
    n = randInt(1, max);
  } else {
    n = randInt(Math.max(2, Math.floor(max / 3)), max);
  }
  const direction: 'r2n' | 'n2r' = Math.random() < 0.5 ? 'r2n' : 'n2r';
  const roman = toRoman(n);
  if (direction === 'r2n') {
    return { skill, direction, prompt: roman, answer: String(n) };
  }
  return { skill, direction, prompt: String(n), answer: roman };
}

// ---------- Ordering ----------

function buildOrder(difficulty: Difficulty): NumberSenseOrderQuestion {
  // Y3 to 1000, Y4 to 10000, Y5 to 1,000,000. Map difficulty to range.
  const max =
    difficulty === 'easy' ? 1000 : difficulty === 'medium' ? 10000 : 1000000;
  // Four distinct numbers.
  const set = new Set<number>();
  while (set.size < 4) {
    set.add(randInt(1, max));
  }
  const numbers = Array.from(set);
  const answer = [...numbers].sort((a, b) => a - b);
  // Shuffle `numbers` so it isn't accidentally already sorted.
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  // Final safety: if the shuffle happens to land sorted (1/24 chance), swap
  // the first two to guarantee a distinct prompt.
  if (numbers.every((v, i) => v === answer[i])) {
    [numbers[0], numbers[1]] = [numbers[1], numbers[0]];
  }
  return { skill: 'order-numbers', numbers, answer };
}

// ---------- Negative interval (Y6) ----------

function buildNegativeInterval(difficulty: Difficulty): NumberSenseNegativeIntervalQuestion {
  // From a negative endpoint to a positive (or vice versa). The interval is
  // |to - from|. Difficulty scales the magnitude of each endpoint.
  const mag = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 30 : 100;
  // Force one side negative and one side positive so the interval truly
  // crosses zero (the NC objective wording is "intervals across zero").
  const from = -randInt(1, mag);
  const to = randInt(1, mag);
  const answer = to - from; // always positive given from<0<to
  return { skill: 'negative-interval', from, to, answer };
}

// ---------- BIDMAS / order of operations (Y6) ----------

// Build a small expression that exercises operator precedence. We render
// it as a string using WinAnsi-safe glyphs ('+', '-', '×', '÷') and pin
// the canonical numeric value computed in JS arithmetic so the answer is
// always exact.
function buildBidmas(difficulty: Difficulty): NumberSenseBidmasQuestion {
  // Helper: pick a small operand.
  const small = () => randInt(2, 9);

  // Forms (each guarantees an integer answer to keep the kid focused on
  // the precedence rule, not on decimal arithmetic):
  //   easy:    a + b × c   |   a × b - c   |   (a + b) × c
  //   medium:  adds parentheses cases     |   a × b + c × d
  //   hard:    a × b + c × d - e          |   a + b × (c + d)
  // Each branch produces an expression string and the numeric answer.

  type Form = { expression: string; answer: number };
  const forms: Array<() => Form> = [];

  // Always include the canonical Y6 example shape a + b × c.
  forms.push(() => {
    const a = small();
    const b = small();
    const c = small();
    return { expression: `${a} + ${b} × ${c}`, answer: a + b * c };
  });

  // a × b - c (multiplication binds tighter than subtraction).
  forms.push(() => {
    const a = small();
    const b = small();
    const ab = a * b;
    // Pick c strictly below the product so the result stays non-negative.
    // (A commutative swap can't help — a×b == b×a — so clamp c instead.)
    const c = randInt(1, ab - 1);
    return { expression: `${a} × ${b} - ${c}`, answer: ab - c };
  });

  if (difficulty !== 'easy') {
    // (a + b) × c — parentheses override.
    forms.push(() => {
      const a = small();
      const b = small();
      const c = small();
      return { expression: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
    });
    // a × b + c × d
    forms.push(() => {
      const a = small();
      const b = small();
      const c = small();
      const d = small();
      return { expression: `${a} × ${b} + ${c} × ${d}`, answer: a * b + c * d };
    });
    // a ÷ b + c — guarantee b divides a.
    forms.push(() => {
      const b = randInt(2, 5);
      const q = randInt(2, 9);
      const a = b * q;
      const c = small();
      return { expression: `${a} ÷ ${b} + ${c}`, answer: q + c };
    });
  }

  if (difficulty === 'hard') {
    // a + b × (c + d)
    forms.push(() => {
      const a = small();
      const b = small();
      const c = small();
      const d = small();
      return { expression: `${a} + ${b} × (${c} + ${d})`, answer: a + b * (c + d) };
    });
    // a × b + c × d - e (kept non-negative)
    forms.push(() => {
      const a = small();
      const b = small();
      const c = small();
      const d = small();
      const e = randInt(1, 9);
      const v = a * b + c * d;
      const ee = Math.min(e, v); // never go negative
      return { expression: `${a} × ${b} + ${c} × ${d} - ${ee}`, answer: v - ee };
    });
  }

  const make = pickFrom(forms);
  return { skill: 'bidmas', ...make() };
}

// ---------- Top-level generator ----------

function sampleOne(skill: NumberSenseSkill, difficulty: Difficulty): NumberSenseQuestion {
  switch (skill) {
    case 'place-value-3d':
    case 'place-value-4d':
    case 'place-value-7d':
    case 'place-value-10m':
      return buildPlaceValue(skill);
    case 'round-10':
    case 'round-100':
    case 'round-1000':
    case 'round-10k':
    case 'round-1m':
      return buildRound(skill, difficulty);
    case 'count-multiples':
      return buildMultiples(difficulty);
    case 'negative-count':
      return buildNegativeCount(difficulty);
    case 'negative-interval':
      return buildNegativeInterval(difficulty);
    case 'roman-100':
    case 'roman-1000':
      return buildRoman(skill, difficulty);
    case 'order-numbers':
      return buildOrder(difficulty);
    case 'bidmas':
      return buildBidmas(difficulty);
  }
}

export function generateNumberSenseQuestions(
  settings: NumberSenseSettings,
  count: number
): NumberSenseQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['place-value-3d'] as NumberSenseSkill[]);
  const out: NumberSenseQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(skills);
    out.push(sampleOne(skill, settings.difficulty));
  }
  return out;
}

// ---------- Answer formatting / validation ----------

// Render the question prompt as plain text suitable for the PDF and the
// results-screen recap. Roman/place-value/etc. all flatten to ASCII.
const ROUND_NEAREST_KEY: Record<number, MessageKey> = {
  10: 'numberSense.nearest.10',
  100: 'numberSense.nearest.100',
  1000: 'numberSense.nearest.1000',
  10000: 'numberSense.nearest.10000',
  100000: 'numberSense.nearest.100000',
  1000000: 'numberSense.nearest.1000000',
};

export function questionPromptText(q: NumberSenseQuestion): string {
  if (isPlaceValueQuestion(q)) {
    const digitStr = String(q.number)[q.digitIndex];
    return t('numberSense.prompt.placeValue', { digit: digitStr, number: q.number });
  }
  if (isRoundQuestion(q)) {
    const label = t(ROUND_NEAREST_KEY[q.nearest] ?? 'numberSense.nearest.1000000');
    return t('numberSense.prompt.round', { number: q.number.toLocaleString('en-GB'), nearest: label });
  }
  if (isSequenceQuestion(q)) {
    const cells = q.sequence.map((n, i) => (q.missingIndices.includes(i) ? '?' : String(n)));
    return cells.join(', ');
  }
  if (isRomanQuestion(q)) {
    return q.direction === 'r2n'
      ? t('numberSense.prompt.convertToNumber', { value: q.prompt })
      : t('numberSense.prompt.convertToRoman', { value: q.prompt });
  }
  if (isNegativeIntervalQuestion(q)) {
    return t('numberSense.prompt.fromTo', { from: q.from, to: q.to });
  }
  if (isBidmasQuestion(q)) {
    return `${q.expression} = ?`;
  }
  // order-numbers
  return t('numberSense.prompt.orderSmallestToLargest', { list: q.numbers.join(', ') });
}

// Render the canonical answer text. Used by PDF answer-key and Results.
export function answerText(q: NumberSenseQuestion): string {
  if (isPlaceValueQuestion(q)) return String(q.answer);
  if (isRoundQuestion(q)) return String(q.answer);
  if (isSequenceQuestion(q)) return q.answers.join(', ');
  if (isRomanQuestion(q)) return q.answer;
  if (isNegativeIntervalQuestion(q)) return String(q.answer);
  if (isBidmasQuestion(q)) return String(q.answer);
  return q.answer.join(', ');
}

// Parse a kid's typed answer for a sequence skill. Accepts comma- or
// whitespace-separated integers; returns null when any token fails to parse.
export function parseSequenceAnswer(input: string): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/[,\s]+/).filter(t => t.length > 0);
  if (tokens.length === 0) return null;
  const out: number[] = [];
  for (const t of tokens) {
    // Accept leading minus and digits.
    if (!/^-?\d+$/.test(t)) return null;
    const n = parseInt(t, 10);
    if (isNaN(n)) return null;
    out.push(n);
  }
  return out;
}

// Generic answer-check. Returns true iff the kid's input matches the
// canonical answer for this question type. `input` is always the raw string
// that came out of the input box; we centralise the per-skill parsing here
// so play/results/pdf stay clean.
export function checkNumberSenseAnswer(q: NumberSenseQuestion, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (
    isPlaceValueQuestion(q) ||
    isRoundQuestion(q) ||
    isNegativeIntervalQuestion(q) ||
    isBidmasQuestion(q)
  ) {
    if (!/^-?\d+$/.test(trimmed)) return false;
    const n = parseInt(trimmed, 10);
    return !isNaN(n) && n === q.answer;
  }
  if (isSequenceQuestion(q)) {
    const parsed = parseSequenceAnswer(trimmed);
    if (parsed === null) return false;
    if (parsed.length !== q.answers.length) return false;
    return parsed.every((v, i) => v === q.answers[i]);
  }
  if (isRomanQuestion(q)) {
    if (q.direction === 'r2n') {
      if (!/^-?\d+$/.test(trimmed)) return false;
      return parseInt(trimmed, 10) === parseInt(q.answer, 10);
    }
    // n2r — case-insensitive match.
    return trimmed.toUpperCase().replace(/\s+/g, '') === q.answer.toUpperCase();
  }
  // order-numbers
  const parsed = parseSequenceAnswer(trimmed);
  if (parsed === null) return false;
  if (parsed.length !== q.answer.length) return false;
  return parsed.every((v, i) => v === q.answer[i]);
}

// ---------- Discriminators ----------

export function isPlaceValueQuestion(q: NumberSenseQuestion): q is NumberSensePlaceValueQuestion {
  return (
    q.skill === 'place-value-3d' ||
    q.skill === 'place-value-4d' ||
    q.skill === 'place-value-7d' ||
    q.skill === 'place-value-10m'
  );
}

export function isRoundQuestion(q: NumberSenseQuestion): q is NumberSenseRoundQuestion {
  return (
    q.skill === 'round-10' ||
    q.skill === 'round-100' ||
    q.skill === 'round-1000' ||
    q.skill === 'round-10k' ||
    q.skill === 'round-1m'
  );
}

export function isSequenceQuestion(q: NumberSenseQuestion): q is NumberSenseSequenceQuestion {
  return q.skill === 'count-multiples' || q.skill === 'negative-count';
}

export function isRomanQuestion(q: NumberSenseQuestion): q is NumberSenseRomanQuestion {
  return q.skill === 'roman-100' || q.skill === 'roman-1000';
}

export function isOrderQuestion(q: NumberSenseQuestion): q is NumberSenseOrderQuestion {
  return q.skill === 'order-numbers';
}

export function isNegativeIntervalQuestion(
  q: NumberSenseQuestion
): q is NumberSenseNegativeIntervalQuestion {
  return q.skill === 'negative-interval';
}

export function isBidmasQuestion(q: NumberSenseQuestion): q is NumberSenseBidmasQuestion {
  return q.skill === 'bidmas';
}

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: NumberSenseQuestion, difficulty: Difficulty): string[] {
  const s = answerText(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !checkNumberSenseAnswer(q, c));
}
