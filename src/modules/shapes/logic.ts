// Shapes module — geometry practice.
//
// v1 + v1.1: the eight skills below. Deferred to v2: name-3d, count-faces,
// angle-measure, volume-cube, volume-cuboid. Mixed-unit problems and
// two-decimal dimensions are also deferred (hard difficulty currently
// behaves like medium for the new geometry skills — see
// `dimensionSamplerForDifficulty`).

export type ShapeSkill =
  | 'name-2d'
  | 'count-sides'
  | 'perimeter-rect'
  | 'area-rect'
  | 'area-tri'
  | 'area-circle'
  | 'circumference'
  | 'angle-name';

export type ShapeKind =
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'circle';

export type ShapeUnits = 'cm' | 'm' | 'mm' | 'in';
export type ShapeDifficulty = 'easy' | 'medium' | 'hard';

/** Possible answers for the angle-name skill. */
export type AngleCategory = 'acute' | 'right' | 'obtuse';
export const ANGLE_CATEGORIES: ReadonlyArray<AngleCategory> = ['acute', 'right', 'obtuse'];

export const SHAPE_SKILL_OPTIONS: ReadonlyArray<ShapeSkill> = [
  'name-2d',
  'count-sides',
  'perimeter-rect',
  'area-rect',
  'area-tri',
  'area-circle',
  'circumference',
  'angle-name',
];

export const SHAPE_SKILL_LABEL: Record<ShapeSkill, string> = {
  'name-2d': 'Name (2D)',
  'count-sides': 'Count sides',
  'perimeter-rect': 'Perimeter (rect)',
  'area-rect': 'Area (rect)',
  'area-tri': 'Area (triangle)',
  'area-circle': 'Area (circle)',
  'circumference': 'Circumference',
  'angle-name': 'Name angle',
};

export const SHAPE_KIND_OPTIONS: ReadonlyArray<ShapeKind> = [
  'triangle',
  'square',
  'rectangle',
  'pentagon',
  'hexagon',
  'octagon',
  'circle',
];

// Side counts for the named 2D shapes. Circle has no straight sides — we
// store 0 and the generator avoids picking 'circle' for the count-sides
// skill so the kid never sees an unanswerable "how many sides" prompt.
export const SHAPE_SIDE_COUNT: Record<ShapeKind, number> = {
  triangle: 3,
  square: 4,
  rectangle: 4,
  pentagon: 5,
  hexagon: 6,
  octagon: 8,
  circle: 0,
};

export const SHAPE_UNIT_OPTIONS: ReadonlyArray<ShapeUnits> = ['cm', 'm', 'mm', 'in'];

export const SHAPE_DIFFICULTY_OPTIONS: ReadonlyArray<ShapeDifficulty> = [
  'easy',
  'medium',
  'hard',
];

/** π approximation used for area-circle and circumference. Matches the
 *  value the worksheet asks the kid to use ("use 3.14 for pi"). Keeping
 *  it as a constant means rounding semantics are easy to reason about. */
export const PI_APPROX = 3.14;

/**
 * Squared unit label as a single token, e.g. `cm²`. Uses U+00B2 SUPERSCRIPT
 * TWO which IS in Helvetica's WinAnsi encoding, so it's PDF-safe. We
 * deliberately do not introduce a U+00B3 form for cubic units in v1 —
 * volume skills are deferred.
 */
export function unitsSquared(units: ShapeUnits): string {
  return `${units}²`;
}

export interface ShapeQuestion {
  skill: ShapeSkill;
  /** For name-2d / count-sides: drives both render and answer. */
  shape?: ShapeKind;
  /** For perimeter-rect / area-rect / area-tri: dimensions in chosen units. */
  width?: number;
  height?: number;
  /** For area-circle / circumference: radius in chosen units. */
  radius?: number;
  /** For angle-name: the measured angle in degrees (used by the SVG +
   *  PDF renderers). The canonical answer is the angle category. */
  angle?: number;
  /** For angle-name: the categorical answer string ('acute' / 'right' /
   *  'obtuse'). For other skills, undefined. */
  category?: AngleCategory;
  units: ShapeUnits;
  /** Numeric answer (count, perimeter, area, circumference). For naming
   *  skills the canonical answer is a string (name / category); we still
   *  store a number here so legacy callers (e.g. side count) don't need
   *  to special-case the type. */
  answer: number;
}

export interface ShapeSettings {
  /** Non-empty subset of ShapeSkill. Default ['name-2d']. */
  skills: ShapeSkill[];
  /** Single-select unit. Default 'cm'. */
  units: ShapeUnits;
  /** Affects dimension ranges for the metric skills. */
  difficulty: ShapeDifficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Max dimension for a rectangle generator at the given difficulty. */
export function maxDimensionForDifficulty(d: ShapeDifficulty): number {
  if (d === 'easy') return 10;
  if (d === 'medium') return 20;
  return 50;
}

/**
 * Sample one dimension for the new geometry skills (triangle base/height,
 * circle radius). Easy uses whole numbers; medium uses one-decimal place.
 * Hard currently mirrors medium — two-decimal mixed-unit problems are
 * deferred per the v1 spec.
 */
function sampleDimension(d: ShapeDifficulty): number {
  if (d === 'easy') return randInt(1, 10);
  // medium + hard (hard is intentionally same as medium for v1)
  // one decimal place, range 1.0 .. 10.0
  return Math.round((1 + Math.random() * 9) * 10) / 10;
}

// For count-sides, exclude 'circle' — circles don't have a discrete side
// count children would write as a number. For name-2d, we keep all 7 so
// "circle" remains a valid MC answer.
const NAMED_POLYGONS: ReadonlyArray<ShapeKind> = [
  'triangle',
  'square',
  'rectangle',
  'pentagon',
  'hexagon',
  'octagon',
];

/** Round to 2 decimal places — used to keep computed numeric answers
 *  comparable in a stable way. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildQuestion(
  skill: ShapeSkill,
  units: ShapeUnits,
  difficulty: ShapeDifficulty
): ShapeQuestion {
  if (skill === 'name-2d') {
    const shape = pick(SHAPE_KIND_OPTIONS);
    return {
      skill,
      shape,
      units,
      // For naming, the numeric `answer` is side count (handy fallback);
      // the actual right answer is the shape name resolved at render time.
      answer: SHAPE_SIDE_COUNT[shape],
    };
  }
  if (skill === 'count-sides') {
    const shape = pick(NAMED_POLYGONS);
    return {
      skill,
      shape,
      units,
      answer: SHAPE_SIDE_COUNT[shape],
    };
  }
  if (skill === 'perimeter-rect' || skill === 'area-rect') {
    const max = maxDimensionForDifficulty(difficulty);
    const width = randInt(1, max);
    const height = randInt(1, max);
    if (skill === 'perimeter-rect') {
      return { skill, width, height, units, answer: 2 * (width + height) };
    }
    return { skill, width, height, units, answer: width * height };
  }
  if (skill === 'area-tri') {
    const base = sampleDimension(difficulty);
    const height = sampleDimension(difficulty);
    // ½ × base × height. Rounded to 2 dp so a medium-difficulty problem
    // with one-decimal inputs still gives a tidy displayed answer.
    return {
      skill,
      width: base,
      height,
      units,
      answer: round2(0.5 * base * height),
    };
  }
  if (skill === 'area-circle') {
    const radius = sampleDimension(difficulty);
    return {
      skill,
      radius,
      units,
      answer: round2(PI_APPROX * radius * radius),
    };
  }
  if (skill === 'circumference') {
    const radius = sampleDimension(difficulty);
    return {
      skill,
      radius,
      units,
      answer: round2(2 * PI_APPROX * radius),
    };
  }
  // angle-name. Pick a category, then sample a representative angle.
  // Right is exactly 90°; acute is in 15..85; obtuse is in 95..170.
  // The angle drives the SVG render so the question and the answer
  // always agree.
  const category = pick(ANGLE_CATEGORIES);
  let angle: number;
  if (category === 'right') angle = 90;
  else if (category === 'acute') angle = randInt(15, 85);
  else angle = randInt(95, 170);
  return {
    skill: 'angle-name',
    angle,
    category,
    units,
    answer: angle,
  };
}

/**
 * Produce `count` shape questions. The skill is picked uniformly per
 * question from `settings.skills`; on each pick the helper above resolves
 * the shape / dimensions.
 */
export function generateShapeQuestions(
  settings: ShapeSettings,
  count: number
): ShapeQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : ['name-2d' as ShapeSkill];
  const out: ShapeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pick(skills);
    out.push(buildQuestion(skill, settings.units, settings.difficulty));
  }
  return out;
}

/**
 * Pick three wrong shape-name distractors for a name-2d multiple-choice
 * question. Output is in stable canonical order (the caller is responsible
 * for shuffling for display).
 */
export function pickNameDistractors(correct: ShapeKind, n = 3): ShapeKind[] {
  const pool = SHAPE_KIND_OPTIONS.filter(s => s !== correct);
  // Shuffle a copy.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/**
 * Human-readable shape name for prompt / answer-key text. Stays ASCII-safe
 * (lowercase English words) so jsPDF's Helvetica WinAnsi encoding can
 * always render it.
 */
export function shapeName(shape: ShapeKind): string {
  return shape;
}

/** Short prompt text for a question (used by PDF and online play). */
export function promptFor(q: ShapeQuestion): string {
  switch (q.skill) {
    case 'name-2d':
      return 'Name?';
    case 'count-sides':
      return 'Sides?';
    case 'perimeter-rect':
      return 'Perimeter?';
    case 'area-rect':
      return 'Area?';
    case 'area-tri':
      return 'Area?';
    case 'area-circle':
      // Use the literal word "pi" rather than the π glyph so the prompt
      // stays WinAnsi-safe when it lands in the PDF (jsPDF Helvetica
      // does NOT include U+03C0). 3.14 is also stated explicitly.
      return 'Area? (use 3.14 for pi)';
    case 'circumference':
      return 'Circumference? (use 3.14 for pi)';
    case 'angle-name':
      return 'Angle?';
  }
}

/**
 * Canonical answer string for a question (used by the answer key and
 * by online feedback when revealing the right answer).
 */
export function answerString(q: ShapeQuestion): string {
  if (q.skill === 'name-2d') {
    return q.shape ? shapeName(q.shape) : '';
  }
  if (q.skill === 'count-sides') {
    return String(q.answer);
  }
  if (q.skill === 'angle-name') {
    return q.category ?? '';
  }
  if (q.skill === 'area-tri' || q.skill === 'area-circle' || q.skill === 'area-rect') {
    return `${formatNumber(q.answer)} ${unitsSquared(q.units)}`;
  }
  // perimeter-rect / circumference: linear unit.
  return `${formatNumber(q.answer)} ${q.units}`;
}

/**
 * Format a numeric answer for display. Drops a trailing ".00" / ".0" so
 * whole-number answers stay clean ("12 cm" not "12.00 cm"), while
 * decimals keep up to 2 dp.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Up to 2 decimals; trim trailing zeros.
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

/**
 * Strip a trailing unit token from a typed answer. Accepts the unit
 * itself ("24 cm"), the squared form ("24 cm²" / "24 cm2" / "24 sq cm"),
 * or no unit at all. Case-insensitive.
 */
function stripUnitSuffix(s: string, units: ShapeUnits): string {
  let trimmed = s.trim().toLowerCase();
  if (!trimmed) return trimmed;
  const unitLower = units.toLowerCase();
  const suffixes = [
    `${unitLower}²`,
    `${unitLower}2`,
    `sq ${unitLower}`,
    `square ${unitLower}`,
    unitLower,
  ];
  for (const suf of suffixes) {
    if (trimmed.endsWith(suf)) {
      trimmed = trimmed.slice(0, trimmed.length - suf.length).trim();
      break;
    }
  }
  return trimmed;
}

/**
 * Check a typed/selected answer against the question. For name-2d the
 * input is the shape name string; for angle-name it's the category
 * string; for the numeric skills it's a number string (with optional
 * unit suffix).
 */
export function isAnswerCorrect(q: ShapeQuestion, typed: string): boolean {
  if (typeof typed !== 'string') return false;
  const trimmed = typed.trim().toLowerCase();
  if (!trimmed) return false;
  if (q.skill === 'name-2d') {
    return trimmed === (q.shape ?? '');
  }
  if (q.skill === 'angle-name') {
    return trimmed === (q.category ?? '');
  }
  // Numeric skills — accept the number with or without a unit suffix.
  const numericPart = stripUnitSuffix(typed, q.units);
  if (!numericPart) return false;
  const n = Number(numericPart);
  if (!Number.isFinite(n)) return false;
  // For decimal-answer skills, tolerate 0.01 absolute error so a kid who
  // rounds differently still gets credit (e.g. 28.26 vs 28.27).
  if (q.skill === 'area-tri' || q.skill === 'area-circle' || q.skill === 'circumference') {
    return Math.abs(n - q.answer) < 0.011;
  }
  // count-sides / perimeter-rect / area-rect — integer compare.
  return n === q.answer;
}
