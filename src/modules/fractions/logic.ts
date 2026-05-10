// Fraction simplification uses the standard Euclidean GCD algorithm. Generator
// follows the cross-multiplication add/subtract formulas common in school
// curriculum.
//
// v1 ships four skills (add/sub × same/diff denominator). Deferred to v2:
//   - id      : identify the fraction shaded in a figure
//   - eq      : equivalent fractions (1/2 = ?/6)
//   - cmp     : compare fractions (<, =, >)
//   - mul     : multiply fractions
//   - div     : divide fractions
//   - mixed   : mixed ↔ improper conversion
//   - decimal : fraction ↔ decimal conversion

export type FractionSkill = 'add-same' | 'sub-same' | 'add-diff' | 'sub-diff';

export interface Frac {
  num: number;
  den: number;
}

export interface FractionQuestion {
  skill: FractionSkill;
  a: Frac;
  b: Frac;
  answer: Frac; // ALWAYS in simplest form when settings.simplify is true
}

export interface FractionSettings {
  skills: FractionSkill[]; // chip multi-select, default ['add-same']
  denominators: number[]; // chip multi-select 2..12, default [2,3,4]
  simplify: boolean; // default true: answer must be in simplest form
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: FractionSkill[] = ['add-same', 'sub-same', 'add-diff', 'sub-diff'];
export const DENOMINATOR_OPTIONS: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SKILL_LABELS: Record<FractionSkill, string> = {
  'add-same': 'Add (same denom)',
  'sub-same': 'Subtract (same denom)',
  'add-diff': 'Add (different denom)',
  'sub-diff': 'Subtract (different denom)',
};

export const SKILL_SHORT: Record<FractionSkill, string> = {
  'add-same': 'add-same',
  'sub-same': 'sub-same',
  'add-diff': 'add-diff',
  'sub-diff': 'sub-diff',
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
// visual balance.
export function skillOp(skill: FractionSkill): 'add' | 'sub' {
  return skill === 'add-same' || skill === 'add-diff' ? 'add' : 'sub';
}
