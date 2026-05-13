// Ratio & Proportion module — Y6.
// Skills cover the UK National Curriculum Year 6 "Ratio and proportion"
// strand: percentages of an amount, scale factors, ratio sharing, ratio
// simplification, and equivalent ratios.
//
// All generators are pure functions on Math.random(); no external deps.

export type RatioSkill =
  | 'percent-of'
  | 'scale-factor'
  | 'ratio-share'
  | 'ratio-simplify'
  | 'ratio-equivalent';

export type Difficulty = 'easy' | 'medium' | 'hard';

// percent-of: "15% of 80?" -> 12
export interface PercentOfQuestion {
  skill: 'percent-of';
  percent: number; // integer 1..100
  whole: number;   // integer >= 1
  answer: number;  // (percent * whole) / 100 — integer when constructed
}

// scale-factor: "Scale a 6 cm line by ×3" -> 18 cm
export interface ScaleFactorQuestion {
  skill: 'scale-factor';
  length: number;      // original length, integer
  factor: number;      // multiplier, integer 2..10
  units: string;       // 'cm' (kept for prompt printing)
  answer: number;      // length * factor
}

// ratio-share: "Share £40 in ratio 3:5" -> £15 and £25
export interface RatioShareQuestion {
  skill: 'ratio-share';
  total: number;       // total to share (a positive multiple of (a+b))
  a: number;           // first ratio part
  b: number;           // second ratio part
  answer: [number, number]; // share for a, share for b
}

// ratio-simplify: "Simplify the ratio 12:18" -> "2:3"
export interface RatioSimplifyQuestion {
  skill: 'ratio-simplify';
  left: number;
  right: number;
  answer: [number, number]; // simplified [a, b]
}

// ratio-equivalent: "If 2:5 = 6:?" -> 15
// We display "a:b = c:?" or "a:b = ?:d" and the answer is the missing field.
export interface RatioEquivalentQuestion {
  skill: 'ratio-equivalent';
  a: number;
  b: number;
  given: number;
  missing: 'right' | 'left'; // which side of the second ratio is hidden
  answer: number;
}

export type RatioQuestion =
  | PercentOfQuestion
  | ScaleFactorQuestion
  | RatioShareQuestion
  | RatioSimplifyQuestion
  | RatioEquivalentQuestion;

export interface RatioSettings {
  skills: RatioSkill[];
  difficulty: Difficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: RatioSkill[] = [
  'percent-of',
  'scale-factor',
  'ratio-share',
  'ratio-simplify',
  'ratio-equivalent',
];

export const SKILL_LABELS: Record<RatioSkill, string> = {
  'percent-of': 'Percent of amount',
  'scale-factor': 'Scale factor',
  'ratio-share': 'Share in a ratio',
  'ratio-simplify': 'Simplify a ratio',
  'ratio-equivalent': 'Equivalent ratio',
};

// All Y6, but tagged individually so an external curriculum map can pick
// them up.
export const CURRICULUM_TAGS: Record<
  RatioSkill,
  { year: 6; objective: string }[]
> = {
  'percent-of': [
    { year: 6, objective: 'Solve problems involving the calculation of percentages and the use of percentages for comparison' },
  ],
  'scale-factor': [
    { year: 6, objective: 'Solve problems involving similar shapes where the scale factor is known or can be found' },
  ],
  'ratio-share': [
    { year: 6, objective: 'Solve problems involving the relative sizes of two quantities where missing values can be found by using integer multiplication and division facts' },
  ],
  'ratio-simplify': [
    { year: 6, objective: 'Use ratio and proportion to compare quantities (simplify ratios using common factors)' },
  ],
  'ratio-equivalent': [
    { year: 6, objective: 'Solve problems involving unequal sharing and grouping using knowledge of fractions and multiples' },
  ],
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

// "Friendly" percentages — multiples of 5 that divide cleanly into kid-sized
// amounts, biased toward the canonical examples in the curriculum.
const EASY_PERCENTS = [10, 25, 50, 75];
const MEDIUM_PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80];
const HARD_PERCENTS = [
  1, 2, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 95,
];

function buildPercentOf(difficulty: Difficulty): PercentOfQuestion {
  const pool =
    difficulty === 'easy'
      ? EASY_PERCENTS
      : difficulty === 'medium'
        ? MEDIUM_PERCENTS
        : HARD_PERCENTS;
  // Try a few times to land on an integer answer; otherwise fall back to a
  // canonical 10%-of-multiples-of-10 question.
  for (let i = 0; i < 50; i++) {
    const percent = pickFrom(pool);
    // Whole is a multiple of 100/gcd(percent,100) so the answer is integer.
    const g = gcd(percent, 100);
    const stepBase = 100 / g; // every multiple of stepBase yields integer
    const max = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
    const k = randInt(1, max);
    const whole = stepBase * k;
    if (whole < 1) continue;
    const answer = (percent * whole) / 100;
    if (!Number.isInteger(answer) || answer <= 0) continue;
    return { skill: 'percent-of', percent, whole, answer };
  }
  return { skill: 'percent-of', percent: 10, whole: 80, answer: 8 };
}

function buildScaleFactor(difficulty: Difficulty): ScaleFactorQuestion {
  const maxLen = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 30 : 60;
  const maxFactor = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
  const length = randInt(2, maxLen);
  const factor = randInt(2, maxFactor);
  return { skill: 'scale-factor', length, factor, units: 'cm', answer: length * factor };
}

function buildRatioShare(difficulty: Difficulty): RatioShareQuestion {
  // Pick (a, b) coprime so the simplification step doesn't get tangled up
  // inside the share itself. Total = (a + b) * k.
  const maxPart = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 9 : 12;
  for (let attempt = 0; attempt < 60; attempt++) {
    const a = randInt(1, maxPart);
    const b = randInt(1, maxPart);
    if (a === b) continue;
    if (gcd(a, b) !== 1) continue;
    const kMax = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 12 : 20;
    const k = randInt(2, kMax);
    const total = (a + b) * k;
    return { skill: 'ratio-share', total, a, b, answer: [a * k, b * k] };
  }
  // Fallback: 40 in 3:5 -> 15 and 25.
  return { skill: 'ratio-share', total: 40, a: 3, b: 5, answer: [15, 25] };
}

function buildRatioSimplify(difficulty: Difficulty): RatioSimplifyQuestion {
  // Pick a simplified ratio (a, b) with gcd 1, then multiply by k.
  const maxPart = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 9 : 12;
  for (let attempt = 0; attempt < 60; attempt++) {
    const a = randInt(1, maxPart);
    const b = randInt(1, maxPart);
    if (a === b) continue;
    if (gcd(a, b) !== 1) continue;
    const kMax = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12;
    const k = randInt(2, kMax);
    return { skill: 'ratio-simplify', left: a * k, right: b * k, answer: [a, b] };
  }
  return { skill: 'ratio-simplify', left: 12, right: 18, answer: [2, 3] };
}

function buildRatioEquivalent(difficulty: Difficulty): RatioEquivalentQuestion {
  const maxPart = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 9 : 12;
  const a = randInt(1, maxPart);
  let b = randInt(1, maxPart);
  // Ensure b !== a and gcd(a, b) === 1 for a clean base ratio.
  for (let i = 0; i < 20 && (b === a || gcd(a, b) !== 1); i++) {
    b = randInt(1, maxPart);
  }
  const k = randInt(2, difficulty === 'easy' ? 5 : difficulty === 'medium' ? 8 : 12);
  const missing: 'right' | 'left' = Math.random() < 0.5 ? 'right' : 'left';
  // The displayed second ratio is (a*k):(b*k) with one side hidden.
  if (missing === 'right') {
    return { skill: 'ratio-equivalent', a, b, given: a * k, missing, answer: b * k };
  }
  return { skill: 'ratio-equivalent', a, b, given: b * k, missing, answer: a * k };
}

function sampleOne(skill: RatioSkill, difficulty: Difficulty): RatioQuestion {
  switch (skill) {
    case 'percent-of':
      return buildPercentOf(difficulty);
    case 'scale-factor':
      return buildScaleFactor(difficulty);
    case 'ratio-share':
      return buildRatioShare(difficulty);
    case 'ratio-simplify':
      return buildRatioSimplify(difficulty);
    case 'ratio-equivalent':
      return buildRatioEquivalent(difficulty);
  }
}

export function generateRatioQuestions(
  settings: RatioSettings,
  count: number
): RatioQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['percent-of'] as RatioSkill[]);
  const out: RatioQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(skills);
    out.push(sampleOne(skill, settings.difficulty));
  }
  return out;
}

// Render the question prompt as plain ASCII for screen + PDF. Uses the
// WinAnsi-safe glyphs only (':', '%', '×', plain ASCII otherwise).
export function questionPromptText(q: RatioQuestion): string {
  if (q.skill === 'percent-of') {
    return `${q.percent}% of ${q.whole}?`;
  }
  if (q.skill === 'scale-factor') {
    return `Scale ${q.length} ${q.units} by × ${q.factor}.`;
  }
  if (q.skill === 'ratio-share') {
    return `Share ${q.total} in the ratio ${q.a}:${q.b}.`;
  }
  if (q.skill === 'ratio-simplify') {
    return `Simplify the ratio ${q.left}:${q.right}.`;
  }
  // ratio-equivalent
  if (q.missing === 'right') {
    return `${q.a}:${q.b} = ${q.given}:?`;
  }
  return `${q.a}:${q.b} = ?:${q.given}`;
}

// Render the canonical answer string.
export function answerText(q: RatioQuestion): string {
  if (q.skill === 'percent-of') return String(q.answer);
  if (q.skill === 'scale-factor') return String(q.answer);
  if (q.skill === 'ratio-share') return `${q.answer[0]} and ${q.answer[1]}`;
  if (q.skill === 'ratio-simplify') return `${q.answer[0]}:${q.answer[1]}`;
  // ratio-equivalent
  return String(q.answer);
}

// Parse a "a:b" string, returning { a, b } or null if malformed.
export function parseRatio(input: string): { a: number; b: number } | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s*:\s*/);
  if (parts.length !== 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  if (a <= 0 || b <= 0) return null;
  return { a, b };
}

// Parse a "x and y" / "x, y" / "x y" share answer. Accepts £/$/€ prefixes.
export function parseShareAnswer(input: string): [number, number] | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[£$€]/g, '').trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s*(?:and|,)\s*|\s+/).filter(Boolean);
  if (tokens.length !== 2) return null;
  const a = Number(tokens[0]);
  const b = Number(tokens[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  return [a, b];
}

// Generic answer-check. Accepts any equivalent form for ratio-simplify
// (e.g. 2:3 == 4:6 — the kid is asked to simplify, but if they happened
// to write an equivalent unsimplified one we still reject because the
// skill is "simplify"). For ratio-equivalent the kid provides the missing
// integer.
export function checkRatioAnswer(q: RatioQuestion, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (q.skill === 'percent-of' || q.skill === 'scale-factor' || q.skill === 'ratio-equivalent') {
    if (!/^-?\d+$/.test(trimmed)) return false;
    const n = parseInt(trimmed, 10);
    return n === q.answer;
  }
  if (q.skill === 'ratio-share') {
    const parsed = parseShareAnswer(trimmed);
    if (!parsed) return false;
    return parsed[0] === q.answer[0] && parsed[1] === q.answer[1];
  }
  // ratio-simplify — accept the canonical simplified form only.
  const parsed = parseRatio(trimmed);
  if (!parsed) return false;
  // Simplify the user's input and compare to the canonical (already simplified).
  const g = gcd(parsed.a, parsed.b);
  const ua = parsed.a / g;
  const ub = parsed.b / g;
  return ua === q.answer[0] && ub === q.answer[1];
}

// Discriminator helpers.
export function isPercentOfQuestion(q: RatioQuestion): q is PercentOfQuestion {
  return q.skill === 'percent-of';
}
export function isScaleFactorQuestion(q: RatioQuestion): q is ScaleFactorQuestion {
  return q.skill === 'scale-factor';
}
export function isRatioShareQuestion(q: RatioQuestion): q is RatioShareQuestion {
  return q.skill === 'ratio-share';
}
export function isRatioSimplifyQuestion(q: RatioQuestion): q is RatioSimplifyQuestion {
  return q.skill === 'ratio-simplify';
}
export function isRatioEquivalentQuestion(q: RatioQuestion): q is RatioEquivalentQuestion {
  return q.skill === 'ratio-equivalent';
}
