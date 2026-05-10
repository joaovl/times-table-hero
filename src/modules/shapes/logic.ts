// Shapes module — geometry practice.
//
// v1 scope (the four skills below). Deferred to v2: name-3d, count-faces,
// area-tri, area-circle, circumference, angle-name, angle-measure,
// volume-cube, volume-cuboid. Decimals on dimensions and mixed-unit
// problems are also deferred.

export type ShapeSkill = 'name-2d' | 'count-sides' | 'perimeter-rect' | 'area-rect';
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

export const SHAPE_SKILL_OPTIONS: ReadonlyArray<ShapeSkill> = [
  'name-2d',
  'count-sides',
  'perimeter-rect',
  'area-rect',
];

export const SHAPE_SKILL_LABEL: Record<ShapeSkill, string> = {
  'name-2d': 'Name (2D)',
  'count-sides': 'Count sides',
  'perimeter-rect': 'Perimeter (rect)',
  'area-rect': 'Area (rect)',
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

export interface ShapeQuestion {
  skill: ShapeSkill;
  /** For name-2d / count-sides: drives both render and answer. */
  shape?: ShapeKind;
  /** For perimeter-rect / area-rect: dimensions in chosen units. */
  width?: number;
  height?: number;
  units: ShapeUnits;
  /** Numeric answer (count, perimeter, or area). For name-2d this is the side count too,
   *  but the canonical answer string is the shape name and is derived at render. */
  answer: number;
}

export interface ShapeSettings {
  /** Non-empty subset of ShapeSkill. Default ['name-2d']. */
  skills: ShapeSkill[];
  /** Single-select unit. Default 'cm'. */
  units: ShapeUnits;
  /** Affects dimension ranges for perimeter-rect / area-rect. */
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
  // perimeter-rect / area-rect
  const max = maxDimensionForDifficulty(difficulty);
  const width = randInt(1, max);
  const height = randInt(1, max);
  if (skill === 'perimeter-rect') {
    return {
      skill,
      width,
      height,
      units,
      answer: 2 * (width + height),
    };
  }
  // area-rect
  return {
    skill,
    width,
    height,
    units,
    answer: width * height,
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
  // perimeter-rect / area-rect: include units suffix.
  return `${q.answer} ${q.units}`;
}

/**
 * Check a typed/selected answer against the question. For name-2d the
 * input is the shape name string; for the others it's a number string.
 */
export function isAnswerCorrect(q: ShapeQuestion, typed: string): boolean {
  if (typeof typed !== 'string') return false;
  const trimmed = typed.trim().toLowerCase();
  if (!trimmed) return false;
  if (q.skill === 'name-2d') {
    return trimmed === (q.shape ?? '');
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return false;
  return n === q.answer;
}
