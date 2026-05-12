// Number Theory module — UK National Curriculum Year 5 (with Y4 lead-in).
//
// Skills covered:
//  - factors         "List all factors of 24" -> 1,2,3,4,6,8,12,24
//  - factor-pair     "Is 6 a factor of 24?" yes/no
//  - multiples       "First 5 multiples of 7" -> 7,14,21,28,35
//  - is-multiple     "Is 35 a multiple of 5?" yes/no
//  - prime-recognize "Is 13 prime?" yes/no
//  - prime-list-19   "Which of these are prime: 15, 17, 18, 19, 21?" -> 17, 19
//  - square          "What is 5²?" -> 25
//  - cube            "What is 3³?" -> 27
//  - common-factor   "Common factors of 12 and 18?" -> 1, 2, 3, 6
//  - square-root     "What is √49?" -> 7
//
// PDF encoding safety: ² and ³ are in WinAnsi. √ is NOT — the PDF renderer
// either writes "sqrt(49)" or draws a radical primitive. No glyphs from the
// U+2200..U+22FF Math Operators block are emitted.

export type NumberTheorySkill =
  | 'factors'
  | 'factor-pair'
  | 'multiples'
  | 'is-multiple'
  | 'prime-recognize'
  | 'prime-list-19'
  | 'square'
  | 'cube'
  | 'common-factor'
  | 'square-root';

export type NumberTheoryDifficulty = 'easy' | 'medium' | 'hard';

export const NUMBER_THEORY_SKILL_OPTIONS: ReadonlyArray<NumberTheorySkill> = [
  'factors',
  'factor-pair',
  'multiples',
  'is-multiple',
  'prime-recognize',
  'prime-list-19',
  'square',
  'cube',
  'common-factor',
  'square-root',
];

export const NUMBER_THEORY_SKILL_LABEL: Record<NumberTheorySkill, string> = {
  factors: 'Factors',
  'factor-pair': 'Factor pair (y/n)',
  multiples: 'Multiples',
  'is-multiple': 'Is multiple (y/n)',
  'prime-recognize': 'Is prime (y/n)',
  'prime-list-19': 'Pick the primes',
  square: 'Square (n²)',
  cube: 'Cube (n³)',
  'common-factor': 'Common factors',
  'square-root': 'Square root',
};

export const NUMBER_THEORY_DIFFICULTY_OPTIONS: ReadonlyArray<NumberTheoryDifficulty> = [
  'easy',
  'medium',
  'hard',
];

/**
 * Curriculum coverage tags, exposed as a top-level export so the orchestrator
 * (and any future Hub badge) can advertise which UK National Curriculum
 * objectives this module covers without duplicating the strings.
 */
export const CURRICULUM_TAGS: ReadonlyArray<string> = [
  'Y4: recognise factor pairs',
  'Y4: count in multiples',
  'Y5: identify factors of a given number',
  'Y5: identify multiples',
  'Y5: identify common factors',
  'Y5: know and use the vocabulary of prime numbers',
  'Y5: establish whether a number up to 100 is prime',
  'Y5: recognise and use square numbers and the notation for squared (²)',
  'Y5: recognise and use cube numbers and the notation for cubed (³)',
];

// -- Discriminated question union ------------------------------------------

export interface FactorsQuestion {
  skill: 'factors';
  n: number;
  /** Sorted ascending. */
  answer: number[];
}

export interface CommonFactorQuestion {
  skill: 'common-factor';
  n: number;
  m: number;
  /** Sorted ascending. */
  answer: number[];
}

export interface MultiplesQuestion {
  skill: 'multiples';
  base: number;
  count: number;
  /** First `count` positive multiples of `base`, ascending. */
  answer: number[];
}

export interface FactorPairQuestion {
  skill: 'factor-pair';
  n: number;
  m: number;
  answer: boolean;
}

export interface IsMultipleQuestion {
  skill: 'is-multiple';
  n: number;
  m: number;
  answer: boolean;
}

export interface PrimeRecognizeQuestion {
  skill: 'prime-recognize';
  n: number;
  answer: boolean;
}

export interface PrimeList19Question {
  skill: 'prime-list-19';
  candidates: number[];
  /** Sorted ascending subset of `candidates`. */
  answer: number[];
}

export interface SquareQuestion {
  skill: 'square';
  base: number;
  answer: number;
}

export interface CubeQuestion {
  skill: 'cube';
  base: number;
  answer: number;
}

export interface SquareRootQuestion {
  skill: 'square-root';
  /** The radicand (e.g. 49 for sqrt(49) = 7). Stored as `base` so all
   *  single-input skills share the same shape key. */
  base: number;
  answer: number;
}

export type NumberTheoryQuestion =
  | FactorsQuestion
  | CommonFactorQuestion
  | MultiplesQuestion
  | FactorPairQuestion
  | IsMultipleQuestion
  | PrimeRecognizeQuestion
  | PrimeList19Question
  | SquareQuestion
  | CubeQuestion
  | SquareRootQuestion;

export interface NumberTheorySettings {
  /** Non-empty subset of NumberTheorySkill. Default ['factors']. */
  skills: NumberTheorySkill[];
  difficulty: NumberTheoryDifficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// -- Math helpers ----------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** All positive divisors of n, ascending. n must be a positive integer. */
export function factorsOf(n: number): number[] {
  if (!Number.isInteger(n) || n < 1) return [];
  const out: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      out.push(i);
      if (i !== n / i) out.push(n / i);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Common factors of n and m, ascending. */
export function commonFactorsOf(n: number, m: number): number[] {
  const a = new Set(factorsOf(n));
  return factorsOf(m).filter(x => a.has(x));
}

/** True iff n is prime (for n in any positive integer range we'd care about). */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n < 4) return true; // 2, 3
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/** First `count` positive multiples of `base`, ascending. */
export function firstMultiples(base: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= count; i++) out.push(base * i);
  return out;
}

// Cached lists of primes / non-primes inside common ranges. Built lazily.
function primesUpTo(limit: number): number[] {
  const out: number[] = [];
  for (let i = 2; i <= limit; i++) if (isPrime(i)) out.push(i);
  return out;
}

function compositesInRange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(2, min); i <= max; i++) if (!isPrime(i)) out.push(i);
  return out;
}

// -- Difficulty ranges -----------------------------------------------------

/**
 * Each skill is parameterised by difficulty. The ranges are deliberately
 * conservative — `easy` keeps numbers a kid can mentally factor; `hard`
 * pushes to the curriculum limit (100 for factors / primes, 15 for squares,
 * 10 for cubes).
 */
export interface NumberTheoryRange {
  /** Inclusive lower bound for the primary operand. */
  min: number;
  /** Inclusive upper bound for the primary operand. */
  max: number;
}

export function rangeFor(
  skill: NumberTheorySkill,
  difficulty: NumberTheoryDifficulty
): NumberTheoryRange {
  if (skill === 'factors' || skill === 'factor-pair' || skill === 'common-factor') {
    if (difficulty === 'easy') return { min: 6, max: 24 };
    if (difficulty === 'medium') return { min: 12, max: 50 };
    return { min: 20, max: 100 };
  }
  if (skill === 'multiples' || skill === 'is-multiple') {
    // For multiples, the "base" is the small factor. easy: 2..9, medium: 2..12,
    // hard: 2..15. is-multiple compares a candidate to this base.
    if (difficulty === 'easy') return { min: 2, max: 9 };
    if (difficulty === 'medium') return { min: 2, max: 12 };
    return { min: 2, max: 15 };
  }
  if (skill === 'prime-recognize' || skill === 'prime-list-19') {
    if (difficulty === 'easy') return { min: 2, max: 19 };
    if (difficulty === 'medium') return { min: 2, max: 50 };
    return { min: 2, max: 100 };
  }
  if (skill === 'square') {
    if (difficulty === 'easy') return { min: 2, max: 9 };
    if (difficulty === 'medium') return { min: 2, max: 10 };
    return { min: 2, max: 15 };
  }
  if (skill === 'cube') {
    if (difficulty === 'easy') return { min: 2, max: 5 };
    if (difficulty === 'medium') return { min: 2, max: 10 };
    return { min: 2, max: 10 };
  }
  // square-root mirrors square — radicands are perfect squares of `base`.
  if (difficulty === 'easy') return { min: 2, max: 9 };
  if (difficulty === 'medium') return { min: 2, max: 10 };
  return { min: 2, max: 15 };
}

// -- Question generators ---------------------------------------------------

function buildFactors(d: NumberTheoryDifficulty): FactorsQuestion {
  const r = rangeFor('factors', d);
  const n = randInt(r.min, r.max);
  return { skill: 'factors', n, answer: factorsOf(n) };
}

function buildFactorPair(d: NumberTheoryDifficulty): FactorPairQuestion {
  const r = rangeFor('factor-pair', d);
  const n = randInt(r.min, r.max);
  // Bias 50/50 between a true factor and a non-factor so the kid sees both
  // outcomes evenly.
  const yes = Math.random() < 0.5;
  let m: number;
  const divisors = factorsOf(n).filter(x => x > 1 && x < n);
  if (yes && divisors.length > 0) {
    m = pick(divisors);
  } else {
    // Pick a candidate in [2, n-1] that doesn't divide n.
    const nonDivisors: number[] = [];
    for (let i = 2; i < n; i++) if (n % i !== 0) nonDivisors.push(i);
    m = nonDivisors.length > 0 ? pick(nonDivisors) : 2;
  }
  return { skill: 'factor-pair', n, m, answer: n % m === 0 };
}

function buildMultiples(d: NumberTheoryDifficulty): MultiplesQuestion {
  const r = rangeFor('multiples', d);
  const base = randInt(r.min, r.max);
  // Count: 4..6 for easy, 5..7 for medium, 5..8 for hard.
  const count =
    d === 'easy' ? randInt(4, 6) : d === 'medium' ? randInt(5, 7) : randInt(5, 8);
  return { skill: 'multiples', base, count, answer: firstMultiples(base, count) };
}

function buildIsMultiple(d: NumberTheoryDifficulty): IsMultipleQuestion {
  const r = rangeFor('is-multiple', d);
  const m = randInt(r.min, r.max);
  // n: a number to test. 50% yes, 50% no.
  const yes = Math.random() < 0.5;
  let n: number;
  if (yes) {
    // pick a multiple of m in a sensible range
    const k = randInt(2, 12);
    n = m * k;
  } else {
    // pick a non-multiple in [m+1, 12*m] that is not divisible by m
    const candidates: number[] = [];
    for (let v = m + 1; v <= 12 * m; v++) if (v % m !== 0) candidates.push(v);
    n = candidates.length > 0 ? pick(candidates) : m + 1;
  }
  return { skill: 'is-multiple', n, m, answer: n % m === 0 };
}

function buildPrimeRecognize(d: NumberTheoryDifficulty): PrimeRecognizeQuestion {
  const r = rangeFor('prime-recognize', d);
  const yes = Math.random() < 0.5;
  const primes = primesUpTo(r.max).filter(p => p >= r.min);
  const composites = compositesInRange(r.min, r.max);
  let n: number;
  if (yes && primes.length > 0) {
    n = pick(primes);
  } else if (composites.length > 0) {
    n = pick(composites);
  } else {
    n = primes[0] ?? 2;
  }
  return { skill: 'prime-recognize', n, answer: isPrime(n) };
}

function buildPrimeList19(d: NumberTheoryDifficulty): PrimeList19Question {
  const r = rangeFor('prime-list-19', d);
  const primes = primesUpTo(r.max).filter(p => p >= r.min);
  const composites = compositesInRange(r.min, r.max);
  // Always 5 candidates, with at least 1 prime and 1 composite present.
  const pickN = <T,>(arr: T[], k: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(k, copy.length));
  };
  const numPrimes = randInt(1, Math.min(3, primes.length));
  const numComposites = 5 - numPrimes;
  const chosenPrimes = pickN(primes, numPrimes);
  const chosenComposites = pickN(composites, numComposites);
  let candidates = [...chosenPrimes, ...chosenComposites];
  // Top up if we ran short (small `easy` range).
  if (candidates.length < 5) {
    const more: number[] = [];
    for (let i = r.min; i <= r.max; i++) if (!candidates.includes(i)) more.push(i);
    candidates = [...candidates, ...pickN(more, 5 - candidates.length)];
  }
  // Dedupe + shuffle so the order isn't always primes-first.
  const dedup = Array.from(new Set(candidates));
  for (let i = dedup.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dedup[i], dedup[j]] = [dedup[j], dedup[i]];
  }
  const candidatesFinal = dedup.slice(0, 5);
  const answer = candidatesFinal.filter(c => isPrime(c)).sort((a, b) => a - b);
  return { skill: 'prime-list-19', candidates: candidatesFinal, answer };
}

function buildSquare(d: NumberTheoryDifficulty): SquareQuestion {
  const r = rangeFor('square', d);
  const base = randInt(r.min, r.max);
  return { skill: 'square', base, answer: base * base };
}

function buildCube(d: NumberTheoryDifficulty): CubeQuestion {
  const r = rangeFor('cube', d);
  const base = randInt(r.min, r.max);
  return { skill: 'cube', base, answer: base * base * base };
}

function buildCommonFactor(d: NumberTheoryDifficulty): CommonFactorQuestion {
  const r = rangeFor('common-factor', d);
  // Pick a small shared factor so common factors aren't trivially {1}.
  // Strategy: pick a "gcd seed" g in [2..min(8, r.max/2)], then two multiples
  // of g (allowing one to be exactly 2g, the other up to r.max).
  const gMax = Math.max(2, Math.min(8, Math.floor(r.max / 2)));
  const g = randInt(2, gMax);
  const k1 = randInt(2, Math.max(2, Math.floor(r.max / g)));
  let k2 = randInt(2, Math.max(2, Math.floor(r.max / g)));
  // Avoid the degenerate n === m case.
  if (k2 === k1) k2 = k1 === 2 ? 3 : k1 - 1;
  const n = Math.min(g * k1, g * k2);
  const m = Math.max(g * k1, g * k2);
  return {
    skill: 'common-factor',
    n,
    m,
    answer: commonFactorsOf(n, m),
  };
}

function buildSquareRoot(d: NumberTheoryDifficulty): SquareRootQuestion {
  const r = rangeFor('square-root', d);
  const root = randInt(r.min, r.max);
  return { skill: 'square-root', base: root * root, answer: root };
}

function buildOne(
  skill: NumberTheorySkill,
  difficulty: NumberTheoryDifficulty
): NumberTheoryQuestion {
  switch (skill) {
    case 'factors':
      return buildFactors(difficulty);
    case 'factor-pair':
      return buildFactorPair(difficulty);
    case 'multiples':
      return buildMultiples(difficulty);
    case 'is-multiple':
      return buildIsMultiple(difficulty);
    case 'prime-recognize':
      return buildPrimeRecognize(difficulty);
    case 'prime-list-19':
      return buildPrimeList19(difficulty);
    case 'square':
      return buildSquare(difficulty);
    case 'cube':
      return buildCube(difficulty);
    case 'common-factor':
      return buildCommonFactor(difficulty);
    case 'square-root':
      return buildSquareRoot(difficulty);
  }
}

/**
 * Produce `count` Number-Theory questions. The skill is picked uniformly per
 * question from the non-empty `settings.skills` (empty defaults to 'factors').
 */
export function generateNumberTheoryQuestions(
  settings: NumberTheorySettings,
  count: number
): NumberTheoryQuestion[] {
  const skills =
    settings.skills.length > 0 ? settings.skills : (['factors'] as NumberTheorySkill[]);
  const out: NumberTheoryQuestion[] = [];
  for (let i = 0; i < count; i++) {
    out.push(buildOne(pick(skills), settings.difficulty));
  }
  return out;
}

// -- Prompts and answer formatting -----------------------------------------

/**
 * Short prompt for online play and the PDF question cell. PDF-safe:
 * uses U+00B2 / U+00B3 for square/cube (in WinAnsi) and the literal word
 * "sqrt" for square-root (no √ glyph). For `prime-list-19`, the candidate
 * list is rendered inline.
 */
export function promptFor(q: NumberTheoryQuestion): string {
  switch (q.skill) {
    case 'factors':
      return `Factors of ${q.n}?`;
    case 'common-factor':
      return `Common factors of ${q.n} and ${q.m}?`;
    case 'multiples':
      return `First ${q.count} multiples of ${q.base}?`;
    case 'factor-pair':
      return `Is ${q.m} a factor of ${q.n}?`;
    case 'is-multiple':
      return `Is ${q.n} a multiple of ${q.m}?`;
    case 'prime-recognize':
      return `Is ${q.n} prime?`;
    case 'prime-list-19':
      return `Which of these are prime: ${q.candidates.join(', ')}?`;
    case 'square':
      return `${q.base}² = ?`;
    case 'cube':
      return `${q.base}³ = ?`;
    case 'square-root':
      // Keep WinAnsi-safe: no √ glyph in the prompt text.
      return `sqrt(${q.base}) = ?`;
  }
}

/** Canonical answer string for answer keys and incorrect-question feedback. */
export function answerString(q: NumberTheoryQuestion): string {
  switch (q.skill) {
    case 'factors':
    case 'common-factor':
    case 'multiples':
      return q.answer.join(', ');
    case 'prime-list-19':
      return q.answer.length === 0 ? 'none' : q.answer.join(', ');
    case 'factor-pair':
    case 'is-multiple':
    case 'prime-recognize':
      return q.answer ? 'yes' : 'no';
    case 'square':
    case 'cube':
    case 'square-root':
      return String(q.answer);
  }
}

/**
 * Normalise a typed comma-separated number list into a sorted, deduped
 * ascending array. Whitespace, repeated delimiters, and duplicate values are
 * ignored. Non-numeric tokens cause the whole input to be rejected (returns
 * `null` so the caller can distinguish "garbage" from "deliberately empty").
 */
export function normaliseNumberList(input: string): number[] | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return [];
  // Split on commas, semicolons, and runs of whitespace so "1 2 3" works too.
  const tokens = trimmed.split(/[\s,;]+/).filter(t => t.length > 0);
  const nums: number[] = [];
  for (const tok of tokens) {
    if (!/^-?\d+$/.test(tok)) return null;
    nums.push(Number(tok));
  }
  const dedup = Array.from(new Set(nums));
  return dedup.sort((a, b) => a - b);
}

/** Compare two number arrays elementwise. Both must already be sorted. */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Validate a typed/selected answer against the question. Inputs:
 *  - typed: the raw input string (typed numeric / list answers come in here)
 *  - chosenBool: yes/no choice for boolean skills (null if not provided)
 *
 * The function returns a boolean. List skills compare normalised sorted
 * arrays; boolean skills compare yes/no flags; single-number skills compare
 * parsed integers.
 */
export function isAnswerCorrect(
  q: NumberTheoryQuestion,
  typed: string,
  chosenBool: boolean | null = null
): boolean {
  switch (q.skill) {
    case 'factors':
    case 'common-factor':
    case 'multiples':
    case 'prime-list-19': {
      const arr = normaliseNumberList(typed);
      if (arr === null) return false;
      return arraysEqual(arr, q.answer);
    }
    case 'factor-pair':
    case 'is-multiple':
    case 'prime-recognize':
      return chosenBool === q.answer;
    case 'square':
    case 'cube':
    case 'square-root': {
      const t = typed.trim();
      if (!/^-?\d+$/.test(t)) return false;
      return Number(t) === q.answer;
    }
  }
}

/** Skills that the online player answers via a typed text input. */
export const LIST_SKILLS: ReadonlyArray<NumberTheorySkill> = [
  'factors',
  'common-factor',
  'multiples',
  'prime-list-19',
];

export const BOOL_SKILLS: ReadonlyArray<NumberTheorySkill> = [
  'factor-pair',
  'is-multiple',
  'prime-recognize',
];

export const NUMBER_SKILLS: ReadonlyArray<NumberTheorySkill> = [
  'square',
  'cube',
  'square-root',
];
