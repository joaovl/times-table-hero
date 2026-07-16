// Fraction simplification uses the standard Euclidean GCD algorithm. Generator
// follows the cross-multiplication add/subtract formulas common in school
// curriculum.
//
// v1 shipped four skills (add/sub × same/diff denominator).
// v2 adds four more:
//   - id      : identify the fraction shaded in a figure
//   - eq      : equivalent fractions (1/2 = ?/6)
//   - cmp     : compare fractions (<, =, >)
//   - mixed   : mixed ↔ improper conversion
// v3 adds Y5-coverage multiplication and fraction↔decimal:
//   - mul-by-whole     : 1/4 × 6 = 6/4 = 1 1/2     (Y5)
//   - mixed-mul-whole  : 2 1/3 × 4 = 9 1/3         (Y5)
//   - mul-frac         : 1/4 × 1/2 = 1/8           (Y5 extension / Y6 foundation)
//   - to-decimal       : 1/4 as a decimal = 0.25   (Y5; common families only)
//   - from-decimal     : 0.25 as a fraction = 1/4  (any equivalent accepted)
//
// CURRICULUM OVERLAP: the dedicated `decimals` module (see
// src/modules/decimals/logic.ts) also covers fraction↔decimal conversion.
// We keep `to-decimal` and `from-decimal` here as well because the framing
// is different — this module is fraction-first (kid is "in fractions
// mode"), while the decimals module is decimal-first. The curriculum-map
// agent should treat these as the same NC objective ("recognise and use
// thousandths and relate them to tenths, hundredths and decimal
// equivalents", Y5 Fractions) and not double-count coverage.

export type FractionSkill =
  | 'add-same'
  | 'sub-same'
  | 'add-diff'
  | 'sub-diff'
  | 'id'
  | 'eq'
  | 'cmp'
  | 'mixed'
  | 'mul-by-whole'
  | 'mixed-mul-whole'
  | 'mul-frac'
  | 'to-decimal'
  | 'from-decimal'
  // v4 — Y6 additions.
  | 'add-mixed'
  | 'sub-mixed'
  | 'div-frac-whole';

export interface Frac {
  num: number;
  den: number;
}

// Comparison symbol used by the `cmp` skill. Plain ASCII so it's PDF-safe in
// Helvetica WinAnsi encoding.
export type CmpSymbol = '<' | '=' | '>';

export interface MixedNumber {
  whole: number;
  num: number;
  den: number;
}

// Existing op-style question (add/sub × same/diff).
export interface FractionOpQuestion {
  skill: 'add-same' | 'sub-same' | 'add-diff' | 'sub-diff';
  a: Frac;
  b: Frac;
  answer: Frac; // ALWAYS in simplest form when settings.simplify is true
}

// `id` — render a figure (circle sectors / rect cells) and ask the kid to
// name what fraction is shaded. Answer is the raw shaded/total fraction; we
// accept any equivalent form because asking "is 2/4 simplified?" misses the
// point of this skill.
export interface FractionIdQuestion {
  skill: 'id';
  figure: 'circle' | 'rect';
  total: number; // # sectors (circle) or # cells (rect)
  shaded: number; // 1 <= shaded < total
  // Rect-only layout hints. Ignored for circles.
  rows?: number;
  cols?: number;
  answer: Frac;
}

// `eq` — equivalent fractions. We show `a/b = ?/d` (missing numerator) or
// `a/b = c/?` (missing denominator). `source` is the simplified-or-not given
// fraction. `target` is the equivalent fraction with one field hidden.
// `missing` tells the renderer which side is blank, and `answer` is the value
// that goes in that blank.
export interface FractionEqQuestion {
  skill: 'eq';
  source: Frac;
  target: Frac;
  missing: 'num' | 'den';
  answer: number;
}

// `cmp` — compare two fractions. Answer is the strict relation between them.
export interface FractionCmpQuestion {
  skill: 'cmp';
  a: Frac;
  b: Frac;
  answer: CmpSymbol;
}

// `mixed` — convert between mixed numbers and improper fractions. Two modes:
// 'to-mixed' shows an improper fraction and asks for the mixed form;
// 'to-improper' shows a mixed number and asks for the improper form.
export interface FractionMixedQuestion {
  skill: 'mixed';
  direction: 'to-mixed' | 'to-improper';
  improper: Frac; // the improper form (always available)
  mixed: MixedNumber; // the mixed form (always available)
}

// --- v3 question shapes -------------------------------------------------

// `mul-by-whole` — proper fraction × whole number, e.g. 1/4 × 6.
// answer.whole is optional: if present, the canonical answer is a mixed
// number (whole + num/den); if absent, the canonical answer is the
// improper num/den directly. Acceptance accepts BOTH improper and mixed
// forms as long as they reduce to the same value as the canonical answer.
export interface FractionMulByWholeQuestion {
  skill: 'mul-by-whole';
  frac: Frac; // the proper fraction operand
  whole: number; // 2..10 typically
  answer: { whole?: number; num: number; den: number };
}

// `mixed-mul-whole` — mixed number × whole number, e.g. 2 1/3 × 4.
// Answer canonicalised as mixed form when possible (whole present).
export interface FractionMixedMulWholeQuestion {
  skill: 'mixed-mul-whole';
  mixed: MixedNumber;
  whole: number;
  answer: { whole?: number; num: number; den: number };
}

// `mul-frac` — fraction × fraction, e.g. 1/4 × 1/2 = 1/8.
// Answer simplified; any equivalent form accepted.
export interface FractionMulFracQuestion {
  skill: 'mul-frac';
  a: Frac;
  b: Frac;
  answer: Frac; // simplified canonical form
}

// `to-decimal` — write the given fraction as a decimal, e.g. 1/4 → 0.25.
// Restricted to common families (halves, quarters, fifths, tenths) so the
// decimal answer is a clean terminating value.
export interface FractionToDecimalQuestion {
  skill: 'to-decimal';
  num: number;
  den: number;
  answer: number;
}

// `from-decimal` — write the given decimal as a fraction, e.g. 0.25 → 1/4.
// Any equivalent fraction is accepted.
export interface FractionFromDecimalQuestion {
  skill: 'from-decimal';
  decimal: number;
  num: number; // canonical (simplified) numerator
  den: number; // canonical (simplified) denominator
}

// `add-mixed` / `sub-mixed` — Y6 mixed-number add/subtract with potentially
// different denominators. The canonical answer is stored as a mixed answer
// payload (whole + num/den), simplified; acceptance accepts any equivalent
// improper or mixed form (mirrors mul-by-whole).
export interface FractionMixedAddSubQuestion {
  skill: 'add-mixed' | 'sub-mixed';
  a: MixedNumber;
  b: MixedNumber;
  answer: { whole?: number; num: number; den: number };
}

// `div-frac-whole` — Y6 proper fraction ÷ whole number, e.g. 3/4 ÷ 2 = 3/8.
// Canonical answer is the simplified Frac; acceptance accepts any equivalent.
export interface FractionDivFracWholeQuestion {
  skill: 'div-frac-whole';
  frac: Frac;
  whole: number; // 2..6
  answer: Frac; // simplified canonical (e.g. 3/8 for 3/4 ÷ 2)
}

export type FractionQuestion =
  | FractionOpQuestion
  | FractionIdQuestion
  | FractionEqQuestion
  | FractionCmpQuestion
  | FractionMixedQuestion
  | FractionMulByWholeQuestion
  | FractionMixedMulWholeQuestion
  | FractionMulFracQuestion
  | FractionToDecimalQuestion
  | FractionFromDecimalQuestion
  | FractionMixedAddSubQuestion
  | FractionDivFracWholeQuestion;

export interface FractionSettings {
  skills: FractionSkill[]; // chip multi-select, default ['add-same']
  denominators: number[]; // chip multi-select 2..12, default [2,3,4]
  simplify: boolean; // default true: answer must be in simplest form (op skills only)
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: FractionSkill[] = [
  'add-same',
  'sub-same',
  'add-diff',
  'sub-diff',
  'id',
  'eq',
  'cmp',
  'mixed',
  'mul-by-whole',
  'mixed-mul-whole',
  'mul-frac',
  'to-decimal',
  'from-decimal',
  'add-mixed',
  'sub-mixed',
  'div-frac-whole',
];

export const DENOMINATOR_OPTIONS: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SKILL_LABELS: Record<FractionSkill, string> = {
  'add-same': 'Add (same denom)',
  'sub-same': 'Subtract (same denom)',
  'add-diff': 'Add (different denom)',
  'sub-diff': 'Subtract (different denom)',
  id: 'Identify shaded',
  eq: 'Equivalent fractions',
  cmp: 'Compare fractions',
  mixed: 'Mixed ↔ improper',
  'mul-by-whole': 'Multiply by whole',
  'mixed-mul-whole': 'Mixed × whole',
  'mul-frac': 'Fraction × fraction',
  'to-decimal': 'Fraction → decimal',
  'from-decimal': 'Decimal → fraction',
  'add-mixed': 'Add mixed numbers',
  'sub-mixed': 'Subtract mixed numbers',
  'div-frac-whole': 'Fraction ÷ whole',
};

export const SKILL_SHORT: Record<FractionSkill, string> = {
  'add-same': 'add-same',
  'sub-same': 'sub-same',
  'add-diff': 'add-diff',
  'sub-diff': 'sub-diff',
  id: 'identify',
  eq: 'equivalent',
  cmp: 'compare',
  mixed: 'mixed-improper',
  'mul-by-whole': 'mul-whole',
  'mixed-mul-whole': 'mixed-mul-whole',
  'mul-frac': 'mul-frac',
  'to-decimal': 'to-decimal',
  'from-decimal': 'from-decimal',
  'add-mixed': 'add-mixed',
  'sub-mixed': 'sub-mixed',
  'div-frac-whole': 'div-frac-whole',
};

// Curriculum mapping. Used by the curriculum-coverage agent to know which
// NC year/strand each skill targets. See the v3 header note above re:
// overlap with the `decimals` module — to-decimal / from-decimal are
// shared coverage, not double-counted.
export const CURRICULUM_TAGS: Record<
  FractionSkill,
  { year: 'Y3' | 'Y4' | 'Y5' | 'Y6' | 'Y3/Y4' | 'Y4/Y5'; strand: string }
> = {
  'add-same': { year: 'Y3', strand: 'Fractions' },
  'sub-same': { year: 'Y3', strand: 'Fractions' },
  'add-diff': { year: 'Y5', strand: 'Fractions' },
  'sub-diff': { year: 'Y5', strand: 'Fractions' },
  id: { year: 'Y3', strand: 'Fractions' },
  eq: { year: 'Y3/Y4', strand: 'Fractions' },
  cmp: { year: 'Y4', strand: 'Fractions' },
  mixed: { year: 'Y5', strand: 'Fractions' },
  'mul-by-whole': { year: 'Y5', strand: 'Fractions' },
  'mixed-mul-whole': { year: 'Y5', strand: 'Fractions' },
  'mul-frac': { year: 'Y5', strand: 'Fractions' },
  'to-decimal': { year: 'Y4/Y5', strand: 'Fractions (including decimals)' },
  'from-decimal': { year: 'Y4/Y5', strand: 'Fractions (including decimals)' },
  'add-mixed': {
    year: 'Y6',
    strand: 'Add and subtract fractions with different denominators and mixed numbers using simplification',
  },
  'sub-mixed': {
    year: 'Y6',
    strand: 'Add and subtract fractions with different denominators and mixed numbers using simplification',
  },
  'div-frac-whole': {
    year: 'Y6',
    strand: 'Divide proper fractions by whole numbers',
  },
};

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

export function simplifyFrac(f: Frac): Frac {
  if (f.den === 0) return { num: f.num, den: f.den };
  const g = gcd(f.num, f.den);
  return { num: f.num / g, den: f.den / g };
}

export function fracEquals(a: Frac, b: Frac): boolean {
  // Compare via cross multiplication so 2/4 == 1/2.
  return a.num * b.den === b.num * a.den;
}

export function fracIsSimplified(f: Frac): boolean {
  if (f.den === 0) return false;
  return gcd(f.num, f.den) === 1;
}

// How a typed fraction grades against the canonical op answer:
//   'correct'    — equal, and in simplest form when the skill asks for it
//   'equivalent' — mathematically equal but not simplest form (e.g. 10/16 for
//                  5/8): accepted as correct, with a nudge toward simplest form
//   'wrong'      — not equal (or missing / zero-denominator input)
// Counting equivalent forms as wrong frustrated real users; we now accept them.
export type OpGrade = 'correct' | 'equivalent' | 'wrong';

export function gradeOpAnswer(value: Frac | null, answer: Frac, simplify: boolean): OpGrade {
  if (value === null || value.den === 0) return 'wrong';
  if (!fracEquals(value, answer)) return 'wrong';
  if (simplify && !fracIsSimplified(value)) return 'equivalent';
  return 'correct';
}

// Compare two fractions and return the strict relation. Uses cross
// multiplication; assumes positive denominators (we never generate negatives).
export function compareFrac(a: Frac, b: Frac): CmpSymbol {
  const lhs = a.num * b.den;
  const rhs = b.num * a.den;
  if (lhs < rhs) return '<';
  if (lhs > rhs) return '>';
  return '=';
}

// Convert improper fraction to mixed form. `num` may be < den (proper) — in
// that case `whole = 0` and the fractional part is the original.
export function toMixed(f: Frac): MixedNumber {
  if (f.den === 0) return { whole: 0, num: f.num, den: f.den };
  const whole = Math.trunc(f.num / f.den);
  const rem = f.num - whole * f.den;
  return { whole, num: rem, den: f.den };
}

// Convert mixed number to improper fraction.
export function toImproper(m: MixedNumber): Frac {
  return { num: m.whole * m.den + m.num, den: m.den };
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Single-attempt question build. Returns null when the random pick produces
// an answer we don't want to show (zero, improper, etc); caller retries.
function trySample(
  skill: FractionSkill,
  denominators: number[],
  simplify: boolean
): FractionQuestion | null {
  if (skill === 'add-same' || skill === 'sub-same') {
    const d = pickFrom(denominators);
    if (d < 2) return null;
    let a = randInt(1, d - 1);
    let b = randInt(1, d - 1);

    if (skill === 'sub-same') {
      if (a < b) [a, b] = [b, a];
      // After swap a >= b. Skip degenerate equal-numerator case (answer = 0).
      if (a === b) return null;
      const rawNum = a - b;
      const ans: Frac = { num: rawNum, den: d };
      const final = simplify ? simplifyFrac(ans) : ans;
      // v1 keeps it proper.
      if (final.num <= 0 || final.num >= final.den) return null;
      return { skill, a: { num: a, den: d }, b: { num: b, den: d }, answer: final };
    }

    // add-same
    const rawNum = a + b;
    const ans: Frac = { num: rawNum, den: d };
    const final = simplify ? simplifyFrac(ans) : ans;
    if (final.num <= 0 || final.num >= final.den) return null;
    return { skill, a: { num: a, den: d }, b: { num: b, den: d }, answer: final };
  }

  if (skill === 'add-diff' || skill === 'sub-diff') {
    // add-diff / sub-diff: distinct denominators.
    if (denominators.length < 2) return null;
    let d1 = pickFrom(denominators);
    let d2 = pickFrom(denominators);
    // Re-sample d2 until it's distinct; bounded loop in case denominators has
    // duplicates (shouldn't, but defensive).
    for (let i = 0; i < 10 && d2 === d1; i++) d2 = pickFrom(denominators);
    if (d2 === d1) return null;
    if (d1 < 2 || d2 < 2) return null;

    let a = randInt(1, d1 - 1);
    let b = randInt(1, d2 - 1);

    if (skill === 'sub-diff') {
      // Ensure a/d1 >= b/d2 (compare via cross-multiplication).
      if (a * d2 < b * d1) {
        [a, b] = [b, a];
        [d1, d2] = [d2, d1];
      }
      const num = a * d2 - b * d1;
      if (num === 0) return null;
      const den = d1 * d2;
      const ans: Frac = { num, den };
      const final = simplify ? simplifyFrac(ans) : ans;
      if (final.num <= 0 || final.num >= final.den) return null;
      return { skill, a: { num: a, den: d1 }, b: { num: b, den: d2 }, answer: final };
    }

    // add-diff
    const num = a * d2 + b * d1;
    const den = d1 * d2;
    const ans: Frac = { num, den };
    const final = simplify ? simplifyFrac(ans) : ans;
    if (final.num <= 0 || final.num >= final.den) return null;
    return { skill, a: { num: a, den: d1 }, b: { num: b, den: d2 }, answer: final };
  }

  if (skill === 'id') {
    // Pick a denominator from the chosen set, capped so the figure stays
    // legible. Circles cap at 8 sectors, rects cap at 12 cells.
    const figure: 'circle' | 'rect' = Math.random() < 0.5 ? 'circle' : 'rect';
    const cap = figure === 'circle' ? 8 : 12;
    const candidates = denominators.filter(d => d >= 2 && d <= cap);
    if (candidates.length === 0) return null;
    const total = pickFrom(candidates);
    // Shade between 1 and total-1 so the answer is never 0 or 1 (both make
    // the question trivial).
    const shaded = randInt(1, total - 1);
    const answer: Frac = { num: shaded, den: total };

    if (figure === 'rect') {
      // Pick a row/column layout that keeps cells reasonably proportioned.
      // Prefer 1xN or 2xN; fall back to 1xN if total has no nice factor.
      const layout = pickRectLayout(total);
      return {
        skill: 'id',
        figure,
        total,
        shaded,
        rows: layout.rows,
        cols: layout.cols,
        answer,
      };
    }
    return { skill: 'id', figure, total, shaded, answer };
  }

  if (skill === 'eq') {
    // Pick a small base fraction, scale by k = 2..4 to get the equivalent
    // fraction, randomly hide either the scaled numerator or the scaled
    // denominator. The displayed fractions are NOT required to be in
    // simplest form on the LHS — that's the point of the skill.
    const d = pickFrom(denominators);
    if (d < 2) return null;
    const baseNum = randInt(1, d - 1);
    // Simplify the source so we have a canonical base; if simplification
    // collapses it past 1/2, just use the picked pair.
    const base = simplifyFrac({ num: baseNum, den: d });
    if (base.num <= 0 || base.num >= base.den) return null;
    const k = randInt(2, 4);
    const target: Frac = { num: base.num * k, den: base.den * k };
    // Cap target denominator so the equation stays kid-readable.
    if (target.den > 24) return null;
    const missing: 'num' | 'den' = Math.random() < 0.5 ? 'num' : 'den';
    const answer = missing === 'num' ? target.num : target.den;
    return { skill: 'eq', source: base, target, missing, answer };
  }

  if (skill === 'cmp') {
    // Pick two random proper fractions whose denominators come from the set.
    // Allow same or different denominators — variety matters more than the
    // exact pedagogical staging here.
    if (denominators.length === 0) return null;
    const d1 = pickFrom(denominators);
    const d2 = pickFrom(denominators);
    if (d1 < 2 || d2 < 2) return null;
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const a: Frac = { num: n1, den: d1 };
    const b: Frac = { num: n2, den: d2 };
    const answer = compareFrac(a, b);
    return { skill: 'cmp', a, b, answer };
  }

  if (skill === 'mixed') {
    // Pick a denominator from the set; build a mixed number with whole part
    // 1..4 and a proper fractional part. Randomly emit the question in
    // either direction.
    const d = pickFrom(denominators);
    if (d < 2) return null;
    const whole = randInt(1, 4);
    const partNum = randInt(1, d - 1);
    const mixed: MixedNumber = { whole, num: partNum, den: d };
    const improper = toImproper(mixed);
    const direction: 'to-mixed' | 'to-improper' =
      Math.random() < 0.5 ? 'to-mixed' : 'to-improper';
    return { skill: 'mixed', direction, improper, mixed };
  }

  if (skill === 'mul-by-whole') {
    // Proper fraction × whole (2..10). e.g. 1/4 × 6 = 6/4 = 1 1/2.
    const d = pickFrom(denominators);
    if (d < 2) return null;
    const n = randInt(1, d - 1);
    const w = randInt(2, 10);
    const rawNum = n * w;
    // Canonical answer: simplified improper, then converted to mixed form
    // when num >= den so the displayed canonical reads naturally.
    const simp = simplifyFrac({ num: rawNum, den: d });
    const answer: { whole?: number; num: number; den: number } =
      simp.num >= simp.den
        ? (() => {
            const mx = toMixed(simp);
            return mx.num === 0
              ? { whole: mx.whole, num: 0, den: 1 }
              : { whole: mx.whole, num: mx.num, den: mx.den };
          })()
        : { num: simp.num, den: simp.den };
    return { skill: 'mul-by-whole', frac: { num: n, den: d }, whole: w, answer };
  }

  if (skill === 'mixed-mul-whole') {
    // Mixed × whole (2..6). e.g. 2 1/3 × 4 = 28/3 = 9 1/3.
    const d = pickFrom(denominators);
    if (d < 2) return null;
    const whole = randInt(1, 4);
    const partNum = randInt(1, d - 1);
    const mixed: MixedNumber = { whole, num: partNum, den: d };
    const w = randInt(2, 6);
    const impForm = toImproper(mixed);
    const rawNum = impForm.num * w;
    const simp = simplifyFrac({ num: rawNum, den: d });
    const answer: { whole?: number; num: number; den: number } =
      simp.num >= simp.den
        ? (() => {
            const mx = toMixed(simp);
            return mx.num === 0
              ? { whole: mx.whole, num: 0, den: 1 }
              : { whole: mx.whole, num: mx.num, den: mx.den };
          })()
        : { num: simp.num, den: simp.den };
    return { skill: 'mixed-mul-whole', mixed, whole: w, answer };
  }

  if (skill === 'mul-frac') {
    // Two proper fractions multiplied. Keep both denominators small so the
    // answer's denominator (d1*d2 before simplification) doesn't explode.
    const smallDens = denominators.filter(d => d >= 2 && d <= 8);
    const pool = smallDens.length > 0 ? smallDens : [2, 3, 4];
    const d1 = pickFrom(pool);
    const d2 = pickFrom(pool);
    if (d1 < 2 || d2 < 2) return null;
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const raw: Frac = { num: n1 * n2, den: d1 * d2 };
    const ans = simplifyFrac(raw);
    if (ans.num <= 0 || ans.num >= ans.den) return null; // keep proper for kid
    return {
      skill: 'mul-frac',
      a: { num: n1, den: d1 },
      b: { num: n2, den: d2 },
      answer: ans,
    };
  }

  if (skill === 'to-decimal') {
    // Common-decimals families only: halves, quarters, fifths, tenths.
    // Pick one of those, then a numerator that's strictly proper-or-equal
    // to one. The decimal answer is exact (terminates) for all of these.
    const pool = pickCommonDecimalFamily(denominators);
    if (!pool) return null;
    const { num, den } = pool;
    const answer = num / den;
    return { skill: 'to-decimal', num, den, answer };
  }

  if (skill === 'from-decimal') {
    // Re-use the same common-decimals families. The canonical fraction is
    // stored simplified; acceptance allows any equivalent.
    const pool = pickCommonDecimalFamily(denominators);
    if (!pool) return null;
    const { num, den } = pool;
    const simp = simplifyFrac({ num, den });
    const decimal = num / den;
    return { skill: 'from-decimal', decimal, num: simp.num, den: simp.den };
  }

  if (skill === 'add-mixed' || skill === 'sub-mixed') {
    // Mixed number ± mixed number. Denominators come from the picked set.
    // Allow same or different denominators; the answer is a positive mixed
    // value (caller's acceptance treats any equivalent improper or mixed
    // form as correct).
    if (denominators.length === 0) return null;
    let d1 = pickFrom(denominators);
    let d2 = pickFrom(denominators);
    if (d1 < 2 || d2 < 2) return null;
    let w1 = randInt(1, 3);
    let w2 = randInt(1, 3);
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);

    // Convert both to improper to do the arithmetic, then back to mixed.
    const a: MixedNumber = { whole: w1, num: n1, den: d1 };
    const b: MixedNumber = { whole: w2, num: n2, den: d2 };

    if (skill === 'sub-mixed') {
      // Ensure a >= b so the result is non-negative.
      const aImp = toImproper(a);
      const bImp = toImproper(b);
      // Cross-multiply to compare.
      if (aImp.num * bImp.den < bImp.num * aImp.den) {
        // Swap so a is bigger.
        [w1, w2] = [w2, w1];
        // Re-build with swapped whole/num/den.
        const swapA: MixedNumber = { whole: w1, num: n2, den: d2 };
        const swapB: MixedNumber = { whole: w2, num: n1, den: d1 };
        const aImp2 = toImproper(swapA);
        const bImp2 = toImproper(swapB);
        // Use common denominator d1*d2.
        const num = aImp2.num * bImp2.den - bImp2.num * aImp2.den;
        if (num <= 0) return null;
        const den = aImp2.den * bImp2.den;
        const simp = simplifyFrac({ num, den });
        const answer =
          simp.num >= simp.den
            ? (() => {
                const mx = toMixed(simp);
                return mx.num === 0
                  ? { whole: mx.whole, num: 0, den: 1 }
                  : { whole: mx.whole, num: mx.num, den: mx.den };
              })()
            : { num: simp.num, den: simp.den };
        return { skill, a: swapA, b: swapB, answer };
      }
      const aImp2 = aImp;
      const bImp2 = bImp;
      const num = aImp2.num * bImp2.den - bImp2.num * aImp2.den;
      if (num <= 0) return null;
      const den = aImp2.den * bImp2.den;
      const simp = simplifyFrac({ num, den });
      const answer =
        simp.num >= simp.den
          ? (() => {
              const mx = toMixed(simp);
              return mx.num === 0
                ? { whole: mx.whole, num: 0, den: 1 }
                : { whole: mx.whole, num: mx.num, den: mx.den };
            })()
          : { num: simp.num, den: simp.den };
      return { skill, a, b, answer };
    }

    // add-mixed
    const aImp = toImproper(a);
    const bImp = toImproper(b);
    const num = aImp.num * bImp.den + bImp.num * aImp.den;
    const den = aImp.den * bImp.den;
    const simp = simplifyFrac({ num, den });
    const answer =
      simp.num >= simp.den
        ? (() => {
            const mx = toMixed(simp);
            return mx.num === 0
              ? { whole: mx.whole, num: 0, den: 1 }
              : { whole: mx.whole, num: mx.num, den: mx.den };
          })()
        : { num: simp.num, den: simp.den };
    return { skill, a, b, answer };
  }

  if (skill === 'div-frac-whole') {
    // Proper fraction ÷ whole number. e.g. 3/4 ÷ 2 = 3/8.
    if (denominators.length === 0) return null;
    const d = pickFrom(denominators);
    if (d < 2) return null;
    const n = randInt(1, d - 1);
    const w = randInt(2, 6);
    // Result: n / (d * w), then simplify.
    const raw: Frac = { num: n, den: d * w };
    const ans = simplifyFrac(raw);
    if (ans.num <= 0 || ans.num >= ans.den) return null;
    return { skill: 'div-frac-whole', frac: { num: n, den: d }, whole: w, answer: ans };
  }

  return null;
}

// Common terminating-decimal fraction families used by to-decimal /
// from-decimal. Returns a fraction num/den where den ∈ {2, 4, 5, 10} and
// num is a proper-or-1 numerator. Honors the user's selected denominators
// when a usable family overlaps; otherwise falls back to {2, 4, 5, 10}.
function pickCommonDecimalFamily(
  selected: number[]
): { num: number; den: number } | null {
  const allowed: number[] = [2, 4, 5, 10];
  const overlap = selected.filter(d => allowed.includes(d));
  const pool = overlap.length > 0 ? overlap : allowed;
  const den = pickFrom(pool);
  // For den=2: 1/2. For den=4: 1/4 or 3/4. For den=5: 1/5..4/5. For den=10: 1/10..9/10.
  let num: number;
  if (den === 2) num = 1;
  else if (den === 4) num = pickFrom([1, 3]);
  else if (den === 5) num = randInt(1, 4);
  else num = randInt(1, 9); // den === 10
  return { num, den };
}

// Pick the best rectangle layout (rows × cols) for the given cell count so
// that the figure looks roughly square-ish in the play / PDF view. Avoids
// 1×11 strips when something like 2×6 fits.
function pickRectLayout(total: number): { rows: number; cols: number } {
  // Try to find factor pairs (r, c) with r >= 1, r*c = total, r <= c.
  const pairs: Array<{ rows: number; cols: number }> = [];
  for (let r = 1; r * r <= total; r++) {
    if (total % r === 0) pairs.push({ rows: r, cols: total / r });
  }
  // Prefer 2×N when total is even and not prime; otherwise the closest-to-
  // square pair; else 1×N.
  if (pairs.length === 0) return { rows: 1, cols: total };
  // Prefer rows = 2 if available and 2*c == total.
  const two = pairs.find(p => p.rows === 2);
  if (two) return two;
  // Otherwise the pair with the largest rows (closest to square).
  return pairs[pairs.length - 1];
}

function sampleOne(
  skill: FractionSkill,
  denominators: number[],
  simplify: boolean
): FractionQuestion {
  for (let i = 0; i < 400; i++) {
    const q = trySample(skill, denominators, simplify);
    if (q) return q;
  }
  // Fallback — guaranteed-shape question even if random kept rejecting.
  if (skill === 'add-diff' || skill === 'sub-diff') {
    const dens = denominators.length >= 2 ? denominators : [2, 3];
    const d1 = dens[0] >= 2 ? dens[0] : 2;
    const d2 = dens[1] && dens[1] !== d1 && dens[1] >= 2 ? dens[1] : d1 + 1;
    const a = 1;
    const b = 1;
    if (skill === 'sub-diff') {
      // 1/d1 vs 1/d2: bigger one minus smaller one. Bigger fraction has smaller denom.
      const [hiNum, hiDen, loNum, loDen] =
        d1 <= d2 ? [a, d1, b, d2] : [b, d2, a, d1];
      const num = hiNum * loDen - loNum * hiDen;
      const den = hiDen * loDen;
      const final = simplify ? simplifyFrac({ num, den }) : { num, den };
      return { skill, a: { num: hiNum, den: hiDen }, b: { num: loNum, den: loDen }, answer: final };
    }
    const num = a * d2 + b * d1;
    const den = d1 * d2;
    const final = simplify ? simplifyFrac({ num, den }) : { num, den };
    return { skill, a: { num: a, den: d1 }, b: { num: b, den: d2 }, answer: final };
  }
  if (skill === 'id') {
    const total = 4;
    return {
      skill: 'id',
      figure: 'circle',
      total,
      shaded: 1,
      answer: { num: 1, den: total },
    };
  }
  if (skill === 'eq') {
    return {
      skill: 'eq',
      source: { num: 1, den: 2 },
      target: { num: 2, den: 4 },
      missing: 'num',
      answer: 2,
    };
  }
  if (skill === 'cmp') {
    return { skill: 'cmp', a: { num: 1, den: 2 }, b: { num: 1, den: 3 }, answer: '>' };
  }
  if (skill === 'mixed') {
    const d = denominators[0] >= 2 ? denominators[0] : 3;
    const mixed: MixedNumber = { whole: 1, num: 1, den: d };
    const improper = toImproper(mixed);
    return { skill: 'mixed', direction: 'to-mixed', improper, mixed };
  }
  if (skill === 'mul-by-whole') {
    // Fallback: 1/4 × 2 = 2/4 (proper). Keep as improper canonical to
    // exercise the "improper is acceptable" path.
    return {
      skill: 'mul-by-whole',
      frac: { num: 1, den: 4 },
      whole: 2,
      answer: { num: 1, den: 2 },
    };
  }
  if (skill === 'mixed-mul-whole') {
    // Fallback: 1 1/2 × 2 = 3 (whole).
    return {
      skill: 'mixed-mul-whole',
      mixed: { whole: 1, num: 1, den: 2 },
      whole: 2,
      answer: { whole: 3, num: 0, den: 1 },
    };
  }
  if (skill === 'mul-frac') {
    return {
      skill: 'mul-frac',
      a: { num: 1, den: 2 },
      b: { num: 1, den: 2 },
      answer: { num: 1, den: 4 },
    };
  }
  if (skill === 'to-decimal') {
    return { skill: 'to-decimal', num: 1, den: 2, answer: 0.5 };
  }
  if (skill === 'from-decimal') {
    return { skill: 'from-decimal', decimal: 0.5, num: 1, den: 2 };
  }
  if (skill === 'add-mixed') {
    // 1 1/2 + 1 1/4 = 2 3/4
    return {
      skill: 'add-mixed',
      a: { whole: 1, num: 1, den: 2 },
      b: { whole: 1, num: 1, den: 4 },
      answer: { whole: 2, num: 3, den: 4 },
    };
  }
  if (skill === 'sub-mixed') {
    // 2 1/2 - 1 1/4 = 1 1/4
    return {
      skill: 'sub-mixed',
      a: { whole: 2, num: 1, den: 2 },
      b: { whole: 1, num: 1, den: 4 },
      answer: { whole: 1, num: 1, den: 4 },
    };
  }
  if (skill === 'div-frac-whole') {
    // 1/2 ÷ 2 = 1/4
    return {
      skill: 'div-frac-whole',
      frac: { num: 1, den: 2 },
      whole: 2,
      answer: { num: 1, den: 4 },
    };
  }
  // same-denom fallback
  const d = denominators[0] >= 2 ? denominators[0] : 2;
  const a = 1;
  const b = 1;
  if (skill === 'sub-same') {
    // would be 0; use d=3 with 2-1
    const d2 = Math.max(3, d);
    const final = simplify ? simplifyFrac({ num: 1, den: d2 }) : { num: 1, den: d2 };
    return { skill, a: { num: 2, den: d2 }, b: { num: 1, den: d2 }, answer: final };
  }
  const sumNum = a + b;
  if (sumNum < d) {
    const final = simplify ? simplifyFrac({ num: sumNum, den: d }) : { num: sumNum, den: d };
    return { skill, a: { num: a, den: d }, b: { num: b, den: d }, answer: final };
  }
  // sum equals d → improper; bump denom up
  const d2 = d + 1;
  const final = simplify ? simplifyFrac({ num: 2, den: d2 }) : { num: 2, den: d2 };
  return { skill, a: { num: 1, den: d2 }, b: { num: 1, den: d2 }, answer: final };
}

export function generateFractionQuestions(
  settings: FractionSettings,
  count: number
): FractionQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : ['add-same' as const];
  const denominators =
    settings.denominators.length > 0
      ? [...settings.denominators].sort((a, b) => a - b)
      : [2, 3, 4];

  // Anti-repetition: small skill/denominator spaces used to serve the identical
  // question over and over ("everytime the same question"). We softly avoid the
  // last few questions, and hard-guarantee no two consecutive questions are
  // identical whenever the space has more than one possible question. Degenerate
  // single-question spaces fall through gracefully after bounded retries.
  const RECENT_WINDOW = 4;
  const recent: string[] = [];
  const result: FractionQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(skills);
    let q = sampleOne(skill, denominators, settings.simplify);
    // Prefer a question not seen in the recent window.
    for (let t = 0; t < 15 && recent.includes(JSON.stringify(q)); t++) {
      q = sampleOne(skill, denominators, settings.simplify);
    }
    // Guarantee it differs from the immediately previous one (achievable
    // whenever the space has >= 2 questions).
    const prevKey = result.length > 0 ? JSON.stringify(result[result.length - 1]) : null;
    for (let t = 0; t < 20 && prevKey !== null && JSON.stringify(q) === prevKey; t++) {
      q = sampleOne(skill, denominators, settings.simplify);
    }
    result.push(q);
    recent.push(JSON.stringify(q));
    if (recent.length > RECENT_WINDOW) recent.shift();
  }
  return result;
}

// Operator glyph used in screen and equation rendering. Returned as a plain
// '+' or '-' (ASCII) so PDF output is encoding-safe; screen renders the same
// glyphs but we use the math-minus '−' separately in screen rendering for
// visual balance. Only meaningful for op-style questions; callers should
// already have narrowed the skill.
export function skillOp(skill: FractionSkill): 'add' | 'sub' {
  return skill === 'add-same' || skill === 'add-diff' ? 'add' : 'sub';
}

// Discriminator helpers so consumers don't need to memorise the union shape.
export function isOpQuestion(q: FractionQuestion): q is FractionOpQuestion {
  return (
    q.skill === 'add-same' ||
    q.skill === 'sub-same' ||
    q.skill === 'add-diff' ||
    q.skill === 'sub-diff'
  );
}

export function isIdQuestion(q: FractionQuestion): q is FractionIdQuestion {
  return q.skill === 'id';
}

export function isEqQuestion(q: FractionQuestion): q is FractionEqQuestion {
  return q.skill === 'eq';
}

export function isCmpQuestion(q: FractionQuestion): q is FractionCmpQuestion {
  return q.skill === 'cmp';
}

export function isMixedQuestion(q: FractionQuestion): q is FractionMixedQuestion {
  return q.skill === 'mixed';
}

export function isMulByWholeQuestion(
  q: FractionQuestion
): q is FractionMulByWholeQuestion {
  return q.skill === 'mul-by-whole';
}

export function isMixedMulWholeQuestion(
  q: FractionQuestion
): q is FractionMixedMulWholeQuestion {
  return q.skill === 'mixed-mul-whole';
}

export function isMulFracQuestion(q: FractionQuestion): q is FractionMulFracQuestion {
  return q.skill === 'mul-frac';
}

export function isToDecimalQuestion(
  q: FractionQuestion
): q is FractionToDecimalQuestion {
  return q.skill === 'to-decimal';
}

export function isFromDecimalQuestion(
  q: FractionQuestion
): q is FractionFromDecimalQuestion {
  return q.skill === 'from-decimal';
}

export function isMixedAddSubQuestion(
  q: FractionQuestion
): q is FractionMixedAddSubQuestion {
  return q.skill === 'add-mixed' || q.skill === 'sub-mixed';
}

export function isDivFracWholeQuestion(
  q: FractionQuestion
): q is FractionDivFracWholeQuestion {
  return q.skill === 'div-frac-whole';
}

// Convert an answer payload (whole? + num/den) into a single improper
// fraction. Used by acceptance checks for mul-by-whole / mixed-mul-whole.
export function answerToImproper(a: { whole?: number; num: number; den: number }): Frac {
  const w = a.whole ?? 0;
  // When num=0 and den=1, the answer is a pure whole number → w/1.
  if (a.den === 0) return { num: a.num + w, den: 0 };
  return { num: w * a.den + a.num, den: a.den };
}

// Acceptance for `mul-by-whole` / `mixed-mul-whole`: any equivalent
// improper or mixed form is accepted (e.g. 6/4, 3/2, 1 2/4, 1 1/2 all OK
// for 1/4 × 6). Caller passes the user's input as either an improper
// Frac or a MixedNumber.
export function mulAnswerAccepted(
  canonical: { whole?: number; num: number; den: number },
  user: { kind: 'improper'; value: Frac } | { kind: 'mixed'; value: MixedNumber }
): boolean {
  const target = answerToImproper(canonical);
  if (target.den === 0) return false;
  const userImp: Frac =
    user.kind === 'improper'
      ? user.value
      : { num: user.value.whole * user.value.den + user.value.num, den: user.value.den };
  if (userImp.den === 0) return false;
  return fracEquals(userImp, target);
}

// Decimal acceptance tolerance. Three decimal places gives us safe room
// for the families we generate (halves, quarters, fifths, tenths) without
// ever bumping into FP noise.
export const DECIMAL_TOLERANCE = 1e-3;

export function decimalAnswerAccepted(canonical: number, user: number): boolean {
  if (!isFinite(user)) return false;
  return Math.abs(canonical - user) <= DECIMAL_TOLERANCE;
}
