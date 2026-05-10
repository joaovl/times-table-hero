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
//
// Still deferred to a future version:
//   - mul     : multiply fractions
//   - div     : divide fractions
//   - decimal : fraction ↔ decimal conversion

export type FractionSkill =
  | 'add-same'
  | 'sub-same'
  | 'add-diff'
  | 'sub-diff'
  | 'id'
  | 'eq'
  | 'cmp'
  | 'mixed';

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

export type FractionQuestion =
  | FractionOpQuestion
  | FractionIdQuestion
  | FractionEqQuestion
  | FractionCmpQuestion
  | FractionMixedQuestion;

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

  return null;
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

  const result: FractionQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(skills);
    result.push(sampleOne(skill, denominators, settings.simplify));
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
