// Decimals & Percentages module — UK National Curriculum Years 4-5.
//
// Skills cover:
//   - identify-tenths / identify-hundredths / identify-thousandths
//   - round-1dp / round-2dp
//   - compare-decimals (order 4 values ascending)
//   - fraction-to-decimal / decimal-to-fraction
//   - percent-fraction / percent-decimal / decimal-percent
//   - add-decimals / subtract-decimals
//
// All numeric outputs use JS numbers but we lean on string-based rounding so
// floating-point quirks (0.1 + 0.2 = 0.30000000000000004) never leak through
// to either the screen or the PDF answer key.

import { t, type MessageKey } from '@/lib/i18n/i18n';

export type DecimalsSkill =
  | 'identify-tenths'
  | 'identify-hundredths'
  | 'identify-thousandths'
  | 'round-1dp'
  | 'round-2dp'
  | 'compare-decimals'
  | 'fraction-to-decimal'
  | 'decimal-to-fraction'
  | 'percent-fraction'
  | 'percent-decimal'
  | 'decimal-percent'
  | 'add-decimals'
  | 'subtract-decimals';

export const ALL_SKILLS: DecimalsSkill[] = [
  'identify-tenths',
  'identify-hundredths',
  'identify-thousandths',
  'round-1dp',
  'round-2dp',
  'compare-decimals',
  'fraction-to-decimal',
  'decimal-to-fraction',
  'percent-fraction',
  'percent-decimal',
  'decimal-percent',
  'add-decimals',
  'subtract-decimals',
];

// Kept English-only: consumed by printConfig.ts/pdf.ts for the printed
// worksheet, which is out of scope for this extraction pass.
export const SKILL_LABELS: Record<DecimalsSkill, string> = {
  'identify-tenths': 'Tenths (Y4)',
  'identify-hundredths': 'Hundredths (Y4)',
  'identify-thousandths': 'Thousandths (Y5)',
  'round-1dp': 'Round 1dp (Y4)',
  'round-2dp': 'Round 2dp (Y5)',
  'compare-decimals': 'Order decimals',
  'fraction-to-decimal': 'Fraction → decimal',
  'decimal-to-fraction': 'Decimal → fraction',
  'percent-fraction': 'Percent → fraction (Y5)',
  'percent-decimal': 'Percent → decimal (Y5)',
  'decimal-percent': 'Decimal → percent (Y5)',
  'add-decimals': 'Add decimals',
  'subtract-decimals': 'Subtract decimals',
};

const SKILL_KEY: Record<DecimalsSkill, MessageKey> = {
  'identify-tenths': 'decimals.skills.identifyTenths',
  'identify-hundredths': 'decimals.skills.identifyHundredths',
  'identify-thousandths': 'decimals.skills.identifyThousandths',
  'round-1dp': 'decimals.skills.round1dp',
  'round-2dp': 'decimals.skills.round2dp',
  'compare-decimals': 'decimals.skills.compareDecimals',
  'fraction-to-decimal': 'decimals.skills.fractionToDecimal',
  'decimal-to-fraction': 'decimals.skills.decimalToFraction',
  'percent-fraction': 'decimals.skills.percentFraction',
  'percent-decimal': 'decimals.skills.percentDecimal',
  'decimal-percent': 'decimals.skills.decimalPercent',
  'add-decimals': 'decimals.skills.addDecimals',
  'subtract-decimals': 'decimals.skills.subtractDecimals',
};

export function skillLabel(s: DecimalsSkill): string {
  return t(SKILL_KEY[s]);
}

// UK National Curriculum tags. Exposed so the orchestrator (or a future
// curriculum-tagging UI) can group skills by year group.
export const CURRICULUM_TAGS: Record<DecimalsSkill, { year: 'Y4' | 'Y5' | 'Y4/Y5'; strand: string }> = {
  'identify-tenths': { year: 'Y4', strand: 'Fractions (including decimals)' },
  'identify-hundredths': { year: 'Y4', strand: 'Fractions (including decimals)' },
  'identify-thousandths': { year: 'Y5', strand: 'Fractions (including decimals)' },
  'round-1dp': { year: 'Y4', strand: 'Fractions (including decimals)' },
  'round-2dp': { year: 'Y5', strand: 'Fractions (including decimals)' },
  'compare-decimals': { year: 'Y4/Y5', strand: 'Fractions (including decimals)' },
  'fraction-to-decimal': { year: 'Y4/Y5', strand: 'Fractions (including decimals)' },
  'decimal-to-fraction': { year: 'Y4/Y5', strand: 'Fractions (including decimals)' },
  'percent-fraction': { year: 'Y5', strand: 'Fractions, decimals and percentages' },
  'percent-decimal': { year: 'Y5', strand: 'Fractions, decimals and percentages' },
  'decimal-percent': { year: 'Y5', strand: 'Fractions, decimals and percentages' },
  'add-decimals': { year: 'Y4/Y5', strand: 'Addition and subtraction' },
  'subtract-decimals': { year: 'Y4/Y5', strand: 'Addition and subtraction' },
};

// ---------------------------------------------------------------------------
// Question shapes (discriminated union)
// ---------------------------------------------------------------------------

export interface IdentifyQuestion {
  skill: 'identify-tenths' | 'identify-hundredths' | 'identify-thousandths';
  decimal: number;
  answerNum: number;
  answerDen: number;
}

export interface RoundQuestion {
  skill: 'round-1dp' | 'round-2dp';
  decimal: number;
  /**
   * Number of decimal places in the rounded answer. 0 = round to whole.
   * For `round-1dp`, precision is always 0.
   * For `round-2dp`, precision is 0 or 1.
   */
  precision: 0 | 1;
  answer: number;
}

export interface CompareDecimalsQuestion {
  skill: 'compare-decimals';
  decimals: number[];   // exactly 4 distinct values
  answer: number[];     // same values, sorted ascending
}

export interface FractionDecimalQuestion {
  skill: 'fraction-to-decimal' | 'decimal-to-fraction';
  num: number;
  den: number;
  decimal: number;
}

export interface PercentQuestion {
  skill: 'percent-fraction' | 'percent-decimal' | 'decimal-percent';
  percent: number;
  decimal: number;
  num: number;
  den: number;
}

export interface AddSubDecimalsQuestion {
  skill: 'add-decimals' | 'subtract-decimals';
  a: number;
  b: number;
  answer: number;
  sign: '+' | '-';
}

export type DecimalsQuestion =
  | IdentifyQuestion
  | RoundQuestion
  | CompareDecimalsQuestion
  | FractionDecimalQuestion
  | PercentQuestion
  | AddSubDecimalsQuestion;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface DecimalsSettings {
  skills: DecimalsSkill[];        // chip multi-select, default ['identify-tenths']
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// ---------------------------------------------------------------------------
// Discriminator helpers
// ---------------------------------------------------------------------------

export function isIdentifyQuestion(q: DecimalsQuestion): q is IdentifyQuestion {
  return (
    q.skill === 'identify-tenths' ||
    q.skill === 'identify-hundredths' ||
    q.skill === 'identify-thousandths'
  );
}

export function isRoundQuestion(q: DecimalsQuestion): q is RoundQuestion {
  return q.skill === 'round-1dp' || q.skill === 'round-2dp';
}

export function isCompareQuestion(q: DecimalsQuestion): q is CompareDecimalsQuestion {
  return q.skill === 'compare-decimals';
}

export function isFractionDecimalQuestion(q: DecimalsQuestion): q is FractionDecimalQuestion {
  return q.skill === 'fraction-to-decimal' || q.skill === 'decimal-to-fraction';
}

export function isPercentQuestion(q: DecimalsQuestion): q is PercentQuestion {
  return (
    q.skill === 'percent-fraction' ||
    q.skill === 'percent-decimal' ||
    q.skill === 'decimal-percent'
  );
}

export function isAddSubQuestion(q: DecimalsQuestion): q is AddSubDecimalsQuestion {
  return q.skill === 'add-decimals' || q.skill === 'subtract-decimals';
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format `n` to exactly `dp` decimal places. Uses string truncation so we
// don't leak floating-point dust (e.g. 0.1 + 0.2 → "0.3", not "0.30000...").
export function formatDecimal(n: number, dp: number): string {
  if (!isFinite(n)) return String(n);
  const rounded = roundTo(n, dp);
  if (dp <= 0) return String(Math.round(rounded));
  return rounded.toFixed(dp);
}

// Round to a given number of decimal places using string-based rounding so
// 0.1 + 0.2 actually rounds to 0.3 (not 0.30000000000000004).
export function roundTo(n: number, dp: number): number {
  if (dp <= 0) return Math.round(n);
  // Scale up to integer, round, scale back. Using Number.EPSILON-bias avoids
  // the classic `Math.round(1.005*100)/100 = 1` bug.
  const scale = Math.pow(10, dp);
  return Math.round(n * scale + Number.EPSILON * scale) / scale;
}

// GCD via Euclidean algorithm. Returns 1 for (0, 0).
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

// Simplify n/d → smallest equivalent fraction. (0/d) returns (0, 1).
export function simplifyFraction(n: number, d: number): { num: number; den: number } {
  if (d === 0) return { num: n, den: d };
  if (n === 0) return { num: 0, den: 1 };
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

// ---------------------------------------------------------------------------
// Common-fraction <-> decimal pairs used by the conversion skills.
// ---------------------------------------------------------------------------

export interface FractionPair {
  num: number;
  den: number;
  decimal: number;
}

// Year-4/5 expectations: ½, ¼, ¾, ⅕, ⅖, ⅗, ⅘ and their decimal equivalents.
export const COMMON_FRACTION_PAIRS: readonly FractionPair[] = [
  { num: 1, den: 4, decimal: 0.25 },
  { num: 1, den: 2, decimal: 0.5 },
  { num: 3, den: 4, decimal: 0.75 },
  { num: 1, den: 5, decimal: 0.2 },
  { num: 2, den: 5, decimal: 0.4 },
  { num: 3, den: 5, decimal: 0.6 },
  { num: 4, den: 5, decimal: 0.8 },
];

// Percent ↔ fraction ↔ decimal table for the three percent-* skills. Choices
// are the headline curriculum values: 1%, 10%, 25%, 50%, 75%, 100%, and the
// fifths (20%, 40%, 60%, 80%).
export const COMMON_PERCENT_PAIRS: ReadonlyArray<{
  percent: number;
  decimal: number;
  num: number;
  den: number;
}> = [
  { percent: 1, decimal: 0.01, num: 1, den: 100 },
  { percent: 10, decimal: 0.1, num: 1, den: 10 },
  { percent: 20, decimal: 0.2, num: 1, den: 5 },
  { percent: 25, decimal: 0.25, num: 1, den: 4 },
  { percent: 40, decimal: 0.4, num: 2, den: 5 },
  { percent: 50, decimal: 0.5, num: 1, den: 2 },
  { percent: 60, decimal: 0.6, num: 3, den: 5 },
  { percent: 75, decimal: 0.75, num: 3, den: 4 },
  { percent: 80, decimal: 0.8, num: 4, den: 5 },
  { percent: 100, decimal: 1, num: 1, den: 1 },
];

// ---------------------------------------------------------------------------
// Per-skill question generators
// ---------------------------------------------------------------------------

function buildIdentify(skill: IdentifyQuestion['skill']): IdentifyQuestion {
  if (skill === 'identify-tenths') {
    // 0.1..0.9
    const n = randInt(1, 9);
    return { skill, decimal: roundTo(n / 10, 1), answerNum: n, answerDen: 10 };
  }
  if (skill === 'identify-hundredths') {
    // 0.01..0.99 — avoid clean tenths so kids actually engage with hundredths.
    // We still allow 0.10, 0.20 etc. occasionally for variety.
    const n = randInt(1, 99);
    return { skill, decimal: roundTo(n / 100, 2), answerNum: n, answerDen: 100 };
  }
  // identify-thousandths
  const n = randInt(1, 999);
  return { skill, decimal: roundTo(n / 1000, 3), answerNum: n, answerDen: 1000 };
}

function buildRound(skill: RoundQuestion['skill']): RoundQuestion {
  if (skill === 'round-1dp') {
    // "Round X.Y to the nearest whole number." Pick a 1dp value in 0.1..9.9
    // and ask for the whole-number rounding.
    const tenths = randInt(1, 99);
    const decimal = roundTo(tenths / 10, 1);
    const answer = Math.round(decimal);
    return { skill, decimal, precision: 0, answer };
  }
  // round-2dp: pick a 2dp value and ask to round to either whole or 1dp.
  const hundredths = randInt(1, 999);
  const decimal = roundTo(hundredths / 100, 2);
  const precision: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
  const answer = roundTo(decimal, precision);
  return { skill, decimal, precision, answer };
}

function buildCompare(): CompareDecimalsQuestion {
  // Build 4 distinct decimals that all share at most 3 decimal places. Mix
  // 1dp, 2dp, and 3dp values so the kid has to reason about place value
  // rather than just sort by string length.
  const set = new Set<number>();
  const candidates: number[] = [];
  // Generate 4 distinct values; cap to 3dp so 0.45 vs 0.405 and 0.5 mix.
  while (candidates.length < 4) {
    // Random precision per value (1, 2, or 3 dp).
    const dp = pickFrom([1, 2, 3] as const);
    const max = Math.pow(10, dp) - 1; // exclude .000
    const n = randInt(1, max);
    const v = roundTo(n / Math.pow(10, dp), dp);
    if (!set.has(v)) {
      set.add(v);
      candidates.push(v);
    }
  }
  const answer = [...candidates].sort((a, b) => a - b);
  return { skill: 'compare-decimals', decimals: candidates, answer };
}

function buildFractionDecimal(skill: FractionDecimalQuestion['skill']): FractionDecimalQuestion {
  const pair = pickFrom(COMMON_FRACTION_PAIRS);
  return { skill, num: pair.num, den: pair.den, decimal: pair.decimal };
}

function buildPercent(skill: PercentQuestion['skill']): PercentQuestion {
  const p = pickFrom(COMMON_PERCENT_PAIRS);
  return {
    skill,
    percent: p.percent,
    decimal: p.decimal,
    num: p.num,
    den: p.den,
  };
}

function buildAddSub(skill: AddSubDecimalsQuestion['skill']): AddSubDecimalsQuestion {
  // Pick two values from 1-2 dp ranges. Subtract questions always end up with
  // a non-negative answer (we swap if needed).
  // Mix same-dp (Y4 staple) and different-dp (Y5) operands evenly.
  const dpA = pickFrom([1, 2] as const);
  const dpB = pickFrom([1, 2] as const);
  // Numerators kept below 1000 so the result fits in a small typed answer.
  // Cap so addition stays under 100 in screen display.
  const maxA = dpA === 1 ? 99 : 999;
  const maxB = dpB === 1 ? 99 : 999;
  let a = roundTo(randInt(1, maxA) / Math.pow(10, dpA), dpA);
  let b = roundTo(randInt(1, maxB) / Math.pow(10, dpB), dpB);

  if (skill === 'subtract-decimals') {
    if (a < b) [a, b] = [b, a];
    // Trivially-zero case — bump b down so we don't show "0.3 - 0.3".
    if (a === b) {
      b = roundTo(b / 2, Math.max(dpA, dpB));
    }
    const ansDp = Math.max(dpA, dpB);
    const answer = roundTo(a - b, ansDp);
    return { skill, a, b, answer, sign: '-' };
  }

  const ansDp = Math.max(dpA, dpB);
  const answer = roundTo(a + b, ansDp);
  return { skill, a, b, answer, sign: '+' };
}

function sampleOne(skill: DecimalsSkill): DecimalsQuestion {
  switch (skill) {
    case 'identify-tenths':
    case 'identify-hundredths':
    case 'identify-thousandths':
      return buildIdentify(skill);
    case 'round-1dp':
    case 'round-2dp':
      return buildRound(skill);
    case 'compare-decimals':
      return buildCompare();
    case 'fraction-to-decimal':
    case 'decimal-to-fraction':
      return buildFractionDecimal(skill);
    case 'percent-fraction':
    case 'percent-decimal':
    case 'decimal-percent':
      return buildPercent(skill);
    case 'add-decimals':
    case 'subtract-decimals':
      return buildAddSub(skill);
  }
}

export function generateDecimalsQuestions(
  settings: DecimalsSettings,
  count: number
): DecimalsQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['identify-tenths'] as DecimalsSkill[]);
  const result: DecimalsQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(skills);
    result.push(sampleOne(skill));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Answer-checking helpers
// ---------------------------------------------------------------------------

// Number of decimal places `n` should be reported with, in formatting only.
// For round-2dp at precision=1, the displayed answer must always show 1dp
// (e.g. 3.50 → "3.5", but 3.0 → "3.0" not "3").
export function answerDp(q: RoundQuestion): number {
  return q.precision;
}

// Compare a typed numeric answer to the expected one with a tiny floating-
// point tolerance. We treat null as "wrong".
export function checkNumericAnswer(expected: number, typed: number | null): boolean {
  if (typed === null) return false;
  return Math.abs(expected - typed) < 1e-9;
}

// Compare a typed fraction (n, d) to (expectedNum, expectedDen). We accept
// any equivalent fraction (e.g. 25/100 for 1/4) so we don't penalise kids
// who haven't simplified.
export function checkFractionAnswer(
  expectedNum: number,
  expectedDen: number,
  typedNum: number | null,
  typedDen: number | null
): boolean {
  if (typedNum === null || typedDen === null || typedDen === 0) return false;
  return expectedNum * typedDen === typedNum * expectedDen;
}

// Compare an ordered list of decimals to the expected ascending sort.
export function checkOrderAnswer(expected: number[], typed: number[]): boolean {
  if (typed.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (Math.abs(expected[i] - typed[i]) > 1e-9) return false;
  }
  return true;
}

// Parse a comma-or-space separated list of numbers. Returns null if any
// token fails to parse.
export function parseDecimalList(input: string): number[] | null {
  const tokens = input
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  if (tokens.length === 0) return null;
  const nums: number[] = [];
  for (const t of tokens) {
    const n = Number(t);
    if (!isFinite(n)) return null;
    nums.push(n);
  }
  return nums;
}

// ---------------------------------------------------------------------------
// Display helpers (screen-side; PDF uses its own ASCII-only formatters).
// ---------------------------------------------------------------------------

// Unicode glyphs for common fractions. The browser handles these fine; PDF
// must use the textual "1/4" form because some of them aren't in Helvetica's
// WinAnsi encoding.
const SCREEN_FRAC_GLYPHS: Record<string, string> = {
  '1/2': '½',
  '1/4': '¼',
  '3/4': '¾',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/8': '⅛',
};

export function fractionGlyph(num: number, den: number): string | null {
  return SCREEN_FRAC_GLYPHS[`${num}/${den}`] ?? null;
}
