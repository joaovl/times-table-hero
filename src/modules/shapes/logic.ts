// Shapes module — geometry practice.
//
// v1 + v1.1: the original eight 2D skills (name-2d through angle-name).
// v3 (Y5 coverage) adds 3D-solid identification (name-3d, count-faces,
// count-edges, count-vertices), angle measurement in degrees
// (angle-measure), reflex angles (angle-name-reflex), lines of symmetry
// (lines-of-symmetry), and first-quadrant coordinates (coord-read,
// coord-plot, translation). Volume-of-cubes/cuboids is intentionally
// left to the conversions module to avoid duplication.

import { integerChoices } from '@/lib/game/choices';
import { t, type MessageKey } from '@/lib/i18n/i18n';
export type ShapeSkill =
  | 'name-2d'
  | 'count-sides'
  | 'perimeter-rect'
  | 'area-rect'
  | 'area-tri'
  | 'area-circle'
  | 'circumference'
  | 'angle-name'
  // v3 — Y5-coverage skills.
  | 'name-3d'
  | 'count-faces'
  | 'count-edges'
  | 'count-vertices'
  | 'angle-measure'
  | 'angle-name-reflex'
  | 'lines-of-symmetry'
  | 'coord-read'
  | 'coord-plot'
  | 'translation'
  // v4 — Y6 additions.
  | 'coord-four-quadrants'
  | 'angle-at-point'
  | 'angle-on-line'
  | 'angle-vertical';

export type ShapeKind =
  | 'triangle'
  | 'square'
  | 'rectangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'circle';

/** Named 3D solids for the name-3d / count-* skills. */
export type SolidKind = 'cube' | 'cuboid' | 'cylinder' | 'sphere' | 'cone' | 'pyramid';

export const SOLID_KIND_OPTIONS: ReadonlyArray<SolidKind> = [
  'cube',
  'cuboid',
  'cylinder',
  'sphere',
  'cone',
  'pyramid',
];

// Face / edge / vertex counts for the named solids. Curved solids
// (cylinder / sphere / cone) use the conventional UK-primary counts:
//   cylinder = 3 faces (2 flat, 1 curved), 2 edges, 0 vertices
//   sphere   = 1 face, 0 edges, 0 vertices
//   cone     = 2 faces, 1 edge, 1 vertex (apex)
// These match the most common KS2 mark schemes.
export const SOLID_FACES: Record<SolidKind, number> = {
  cube: 6,
  cuboid: 6,
  cylinder: 3,
  sphere: 1,
  cone: 2,
  pyramid: 5,
};

export const SOLID_EDGES: Record<SolidKind, number> = {
  cube: 12,
  cuboid: 12,
  cylinder: 2,
  sphere: 0,
  cone: 1,
  pyramid: 8,
};

export const SOLID_VERTICES: Record<SolidKind, number> = {
  cube: 8,
  cuboid: 8,
  cylinder: 0,
  sphere: 0,
  cone: 1,
  pyramid: 5,
};

export type ShapeUnits = 'cm' | 'm' | 'mm' | 'in';
export type ShapeDifficulty = 'easy' | 'medium' | 'hard';

/** Possible answers for the angle-name skill (non-reflex). */
export type AngleCategory = 'acute' | 'right' | 'obtuse';
export const ANGLE_CATEGORIES: ReadonlyArray<AngleCategory> = ['acute', 'right', 'obtuse'];

/** Extended angle categories that include reflex (>180°). */
export type AngleCategoryReflex = 'acute' | 'right' | 'obtuse' | 'reflex';
export const ANGLE_CATEGORIES_REFLEX: ReadonlyArray<AngleCategoryReflex> = [
  'acute',
  'right',
  'obtuse',
  'reflex',
];

export const SHAPE_SKILL_OPTIONS: ReadonlyArray<ShapeSkill> = [
  'name-2d',
  'count-sides',
  'perimeter-rect',
  'area-rect',
  'area-tri',
  'area-circle',
  'circumference',
  'angle-name',
  'name-3d',
  'count-faces',
  'count-edges',
  'count-vertices',
  'angle-measure',
  'angle-name-reflex',
  'lines-of-symmetry',
  'coord-read',
  'coord-plot',
  'translation',
  'coord-four-quadrants',
  'angle-at-point',
  'angle-on-line',
  'angle-vertical',
];

// English-only labels: used by the PDF worksheets and as source wording for
// the translated shapeSkillLabel() below.
export const SHAPE_SKILL_LABEL: Record<ShapeSkill, string> = {
  'name-2d': 'Name (2D)',
  'count-sides': 'Count sides',
  'perimeter-rect': 'Perimeter (rect)',
  'area-rect': 'Area (rect)',
  'area-tri': 'Area (triangle)',
  'area-circle': 'Area (circle)',
  'circumference': 'Circumference',
  'angle-name': 'Name angle',
  'name-3d': 'Name (3D)',
  'count-faces': 'Count faces',
  'count-edges': 'Count edges',
  'count-vertices': 'Count vertices',
  'angle-measure': 'Measure angle',
  'angle-name-reflex': 'Name angle (+reflex)',
  'lines-of-symmetry': 'Lines of symmetry',
  'coord-read': 'Read coordinates',
  'coord-plot': 'Plot coordinates',
  'translation': 'Translate point',
  'coord-four-quadrants': 'Coords (4 quadrants)',
  'angle-at-point': 'Angles at a point',
  'angle-on-line': 'Angles on a line',
  'angle-vertical': 'Vertically opposite',
};

const SHAPE_SKILL_KEY: Record<ShapeSkill, MessageKey> = {
  'name-2d': 'shapes.skills.name2d',
  'count-sides': 'shapes.skills.countSides',
  'perimeter-rect': 'shapes.skills.perimeterRect',
  'area-rect': 'shapes.skills.areaRect',
  'area-tri': 'shapes.skills.areaTri',
  'area-circle': 'shapes.skills.areaCircle',
  circumference: 'shapes.skills.circumference',
  'angle-name': 'shapes.skills.angleName',
  'name-3d': 'shapes.skills.name3d',
  'count-faces': 'shapes.skills.countFaces',
  'count-edges': 'shapes.skills.countEdges',
  'count-vertices': 'shapes.skills.countVertices',
  'angle-measure': 'shapes.skills.angleMeasure',
  'angle-name-reflex': 'shapes.skills.angleNameReflex',
  'lines-of-symmetry': 'shapes.skills.linesOfSymmetry',
  'coord-read': 'shapes.skills.coordRead',
  'coord-plot': 'shapes.skills.coordPlot',
  translation: 'shapes.skills.translation',
  'coord-four-quadrants': 'shapes.skills.coordFourQuadrants',
  'angle-at-point': 'shapes.skills.angleAtPoint',
  'angle-on-line': 'shapes.skills.angleOnLine',
  'angle-vertical': 'shapes.skills.angleVertical',
};

/** Translated on-screen label for a shape skill (PDFs keep SHAPE_SKILL_LABEL). */
export function shapeSkillLabel(s: ShapeSkill): string {
  return t(SHAPE_SKILL_KEY[s]);
}

/**
 * Curriculum tags per skill. Maps to UK National Curriculum year groups
 * (Y3..Y6) so a future hub/index page can show "which year does this
 * skill belong to". Y5 work is the focus of v3.
 */
export const CURRICULUM_TAGS: Record<ShapeSkill, string[]> = {
  'name-2d': ['Y2', 'Y3'],
  'count-sides': ['Y2', 'Y3'],
  'perimeter-rect': ['Y3', 'Y4'],
  'area-rect': ['Y4', 'Y5'],
  'area-tri': ['Y5', 'Y6'],
  'area-circle': ['Y6'],
  'circumference': ['Y6'],
  'angle-name': ['Y4'],
  // v3 — Y5 additions.
  'name-3d': ['Y5'],
  'count-faces': ['Y5'],
  'count-edges': ['Y5'],
  'count-vertices': ['Y5'],
  'angle-measure': ['Y5'],
  'angle-name-reflex': ['Y5'],
  'lines-of-symmetry': ['Y4', 'Y5'],
  'coord-read': ['Y4', 'Y5'],
  'coord-plot': ['Y4', 'Y5'],
  'translation': ['Y5'],
  // v4 — Y6 additions.
  // "Describe positions on the full coordinate grid (all four quadrants)"
  'coord-four-quadrants': ['Y6'],
  // "Recognise angles where they meet at a point, on a straight line, or are
  // vertically opposite, and find missing angles" (Y6 Geometry).
  'angle-at-point': ['Y6'],
  'angle-on-line': ['Y6'],
  'angle-vertical': ['Y6'],
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
  /** For name-2d / count-sides / lines-of-symmetry: drives both render
   *  and answer. */
  shape?: ShapeKind;
  /** For name-3d / count-faces / count-edges / count-vertices: the named
   *  3D solid. */
  solid?: SolidKind;
  /** For perimeter-rect / area-rect / area-tri: dimensions in chosen units. */
  width?: number;
  height?: number;
  /** For area-circle / circumference: radius in chosen units. */
  radius?: number;
  /** For angle-name / angle-measure / angle-name-reflex: the measured
   *  angle in degrees (used by the SVG + PDF renderers). */
  angle?: number;
  /** For angle-name: the categorical answer string ('acute' / 'right' /
   *  'obtuse'). For angle-name-reflex this widens to include 'reflex'. */
  category?: AngleCategoryReflex;
  /** For coord-read / coord-plot / translation — the starting point or
   *  the point to be plotted. */
  point?: { x: number; y: number };
  /** For translation — the (dx, dy) vector applied to `point`. The
   *  canonical answer is the resulting point. */
  delta?: { dx: number; dy: number };
  /** Top of the coord grid range — drives the rendered grid size for
   *  the coordinate skills. 5 for easy, 10 for medium, 20 for hard. */
  gridMax?: number;
  units: ShapeUnits;
  /** Numeric answer (count, perimeter, area, circumference, angle in
   *  degrees, symmetry-line count). For naming and coordinate skills
   *  the canonical answer is a string built from other fields — we
   *  still store a number here so legacy callers (e.g. side count)
   *  don't need to special-case the type. */
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

/**
 * Lines of symmetry per shape, treating each ShapeKind as its regular form.
 *   triangle  → equilateral, 3 lines
 *   square    → 4 lines
 *   rectangle → 2 lines (non-square rectangle)
 *   pentagon  → regular, 5 lines
 *   hexagon   → regular, 6 lines
 *   octagon   → regular, 8 lines
 *   circle    → infinite (we exclude it from the symmetry generator).
 */
export const SHAPE_LINES_OF_SYMMETRY: Record<ShapeKind, number> = {
  triangle: 3,
  square: 4,
  rectangle: 2,
  pentagon: 5,
  hexagon: 6,
  octagon: 8,
  circle: 0,
};

// For lines-of-symmetry, easy uses simple, well-known regular shapes.
// Medium / hard widen the pool. Circle is excluded — its "infinite" answer
// doesn't fit an integer input.
const SYMMETRY_EASY_POOL: ReadonlyArray<ShapeKind> = ['square', 'rectangle', 'triangle'];
const SYMMETRY_MEDIUM_POOL: ReadonlyArray<ShapeKind> = [
  'square',
  'rectangle',
  'triangle',
  'pentagon',
  'hexagon',
];
const SYMMETRY_HARD_POOL: ReadonlyArray<ShapeKind> = [
  'square',
  'rectangle',
  'triangle',
  'pentagon',
  'hexagon',
  'octagon',
];

/** Coordinate-grid maximum coord for the given difficulty. */
export function coordGridMaxForDifficulty(d: ShapeDifficulty): number {
  if (d === 'easy') return 5;
  if (d === 'medium') return 10;
  return 20;
}

/**
 * The "nearest N degrees" step used for the angle-measure skill at each
 * difficulty. Easy snaps to 30°, medium to 10°, hard to 5°.
 */
export function angleMeasureStepForDifficulty(d: ShapeDifficulty): number {
  if (d === 'easy') return 30;
  if (d === 'medium') return 10;
  return 5;
}

/**
 * Round an integer up/down to the nearest multiple of `step` (clamped to
 * [min, max]). Used to keep an angle on a kid-friendly tick.
 */
function snapAngle(deg: number, step: number, min: number, max: number): number {
  const snapped = Math.round(deg / step) * step;
  if (snapped < min) return min;
  if (snapped > max) return max;
  return snapped;
}

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
  if (skill === 'name-3d' || skill === 'count-faces' || skill === 'count-edges' || skill === 'count-vertices') {
    const solid = pick(SOLID_KIND_OPTIONS);
    let answer = 0;
    if (skill === 'count-faces') answer = SOLID_FACES[solid];
    else if (skill === 'count-edges') answer = SOLID_EDGES[solid];
    else if (skill === 'count-vertices') answer = SOLID_VERTICES[solid];
    // name-3d's numeric answer is faces (handy fallback); the actual
    // right answer is the solid name resolved at render time.
    else answer = SOLID_FACES[solid];
    return { skill, solid, units, answer };
  }
  if (skill === 'angle-measure') {
    const step = angleMeasureStepForDifficulty(difficulty);
    // Easy / medium: 30°..150° (non-reflex), snapped. Hard: 30°..330°
    // (can be reflex), snapped to 5°.
    const min = 30;
    const max = difficulty === 'hard' ? 330 : 150;
    const raw = randInt(min, max);
    const angle = snapAngle(raw, step, min, max);
    return { skill, angle, units, answer: angle };
  }
  if (skill === 'angle-name-reflex') {
    const category = pick(ANGLE_CATEGORIES_REFLEX);
    let angle: number;
    if (category === 'right') angle = 90;
    else if (category === 'acute') angle = randInt(15, 85);
    else if (category === 'obtuse') angle = randInt(95, 170);
    else angle = randInt(185, 340); // reflex
    return { skill, angle, category, units, answer: angle };
  }
  if (skill === 'lines-of-symmetry') {
    const pool =
      difficulty === 'easy'
        ? SYMMETRY_EASY_POOL
        : difficulty === 'medium'
          ? SYMMETRY_MEDIUM_POOL
          : SYMMETRY_HARD_POOL;
    const shape = pick(pool);
    return { skill, shape, units, answer: SHAPE_LINES_OF_SYMMETRY[shape] };
  }
  if (skill === 'coord-read' || skill === 'coord-plot') {
    const gridMax = coordGridMaxForDifficulty(difficulty);
    // Avoid the (0,0) corner — boring. Pick something in 1..gridMax.
    const x = randInt(1, gridMax);
    const y = randInt(1, gridMax);
    return { skill, point: { x, y }, gridMax, units, answer: x * 100 + y };
  }
  if (skill === 'translation') {
    const gridMax = coordGridMaxForDifficulty(difficulty);
    // Start point — leave headroom so the translation lands inside the
    // grid. We pick the start in 0..gridMax-1, then sample dx/dy that
    // keep the destination within the grid (and != start).
    const sx = randInt(0, Math.max(0, gridMax - 1));
    const sy = randInt(0, Math.max(0, gridMax - 1));
    const maxDx = gridMax - sx;
    const maxDy = gridMax - sy;
    // dx,dy in 1..max each so the kid always moves at least one cell.
    const dx = randInt(1, Math.max(1, maxDx));
    const dy = randInt(1, Math.max(1, maxDy));
    const ex = sx + dx;
    const ey = sy + dy;
    return {
      skill,
      point: { x: sx, y: sy },
      delta: { dx, dy },
      gridMax,
      units,
      answer: ex * 1000 + ey,
    };
  }
  if (skill === 'coord-four-quadrants') {
    // Y6 four-quadrant coordinate read. Both x and y can be negative.
    const gridMax = coordGridMaxForDifficulty(difficulty);
    // Avoid (0,0). Allow negative coordinates.
    let x: number;
    let y: number;
    do {
      x = randInt(-gridMax, gridMax);
      y = randInt(-gridMax, gridMax);
    } while (x === 0 && y === 0);
    // Pack answer as base-of-2*gridMax+1; not used for acceptance
    // (parseCoord handles the string). Store a placeholder positive integer.
    return {
      skill,
      point: { x, y },
      gridMax,
      units,
      answer: Math.abs(x) * 1000 + Math.abs(y),
    };
  }
  if (skill === 'angle-at-point' || skill === 'angle-on-line' || skill === 'angle-vertical') {
    // Y6 angle-rule skills. Pick a known visible angle in a kid-friendly
    // range; the missing angle is derived from the rule.
    //   angle-at-point  : sum of all angles at a point = 360°. We show one
    //                     visible angle and ask for the rest (360 - visible).
    //   angle-on-line   : sum on a straight line = 180°. Same shape with
    //                     180° complement.
    //   angle-vertical  : vertically opposite angles are equal. The "missing"
    //                     angle equals the visible angle.
    const total = skill === 'angle-at-point' ? 360 : skill === 'angle-on-line' ? 180 : 0;
    // Choose a visible angle that's not too close to the boundaries.
    let visible: number;
    if (skill === 'angle-vertical') {
      // Any reasonable angle from 15..165.
      const step = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 5 : 1;
      visible = step * randInt(Math.ceil(15 / step), Math.floor(165 / step));
    } else if (skill === 'angle-on-line') {
      const step = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 5 : 1;
      const min = Math.ceil(20 / step);
      const max = Math.floor(160 / step);
      visible = step * randInt(min, max);
    } else {
      // angle-at-point: leave headroom so the missing angle isn't tiny.
      const step = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 10 : 5;
      const min = Math.ceil(30 / step);
      const max = Math.floor(330 / step);
      visible = step * randInt(min, max);
    }
    const missing = skill === 'angle-vertical' ? visible : total - visible;
    return {
      skill,
      angle: visible,
      units,
      answer: missing,
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
    case 'name-3d':
      return 'Name?';
    case 'count-faces':
      return 'Faces?';
    case 'count-edges':
      return 'Edges?';
    case 'count-vertices':
      return 'Vertices?';
    case 'angle-measure':
      // U+00B0 degree sign IS in WinAnsi so this is PDF-safe.
      return 'Angle? (degrees)';
    case 'angle-name-reflex':
      return 'Angle?';
    case 'lines-of-symmetry':
      return 'Lines of symmetry?';
    case 'coord-read':
      return 'Coordinates? (x,y)';
    case 'coord-plot':
      if (q.point) return `Plot (${q.point.x}, ${q.point.y})`;
      return 'Plot the point';
    case 'translation': {
      const dx = q.delta?.dx ?? 0;
      const dy = q.delta?.dy ?? 0;
      const sx = q.point?.x ?? 0;
      const sy = q.point?.y ?? 0;
      const hx = dx === 0 ? '' : `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`;
      const hy = dy === 0 ? '' : `${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
      const parts = [hx, hy].filter(Boolean).join(', ');
      return `Translate (${sx}, ${sy}) ${parts}. New coords?`;
    }
    case 'coord-four-quadrants':
      return 'Coordinates? (x,y)';
    case 'angle-at-point':
      return 'Missing angle? (sum = 360°)';
    case 'angle-on-line':
      return 'Missing angle? (sum = 180°)';
    case 'angle-vertical':
      return 'Vertically opposite angle?';
  }
}

/**
 * Translated on-screen prompt for a question. Mirrors promptFor() (which the
 * PDFs keep in English/WinAnsi); answer TOKENS (shape names typed/chosen)
 * intentionally remain canonical English until the answer-token localization
 * pass — grading compares against those tokens.
 */
export function promptForScreen(q: ShapeQuestion): string {
  switch (q.skill) {
    case 'name-2d':
    case 'name-3d':
      return t('shapes.prompt.name');
    case 'count-sides':
      return t('shapes.prompt.sides');
    case 'perimeter-rect':
      return t('shapes.prompt.perimeter');
    case 'area-rect':
    case 'area-tri':
      return t('shapes.prompt.area');
    case 'area-circle':
      return t('shapes.prompt.areaPi');
    case 'circumference':
      return t('shapes.prompt.circumferencePi');
    case 'angle-name':
    case 'angle-name-reflex':
      return t('shapes.prompt.angle');
    case 'count-faces':
      return t('shapes.prompt.faces');
    case 'count-edges':
      return t('shapes.prompt.edges');
    case 'count-vertices':
      return t('shapes.prompt.vertices');
    case 'angle-measure':
      return t('shapes.prompt.angleDegrees');
    case 'lines-of-symmetry':
      return t('shapes.prompt.linesOfSymmetry');
    case 'coord-read':
    case 'coord-four-quadrants':
      return t('shapes.prompt.coordinates');
    case 'coord-plot':
      if (q.point) return t('shapes.prompt.plotPoint', { x: q.point.x, y: q.point.y });
      return t('shapes.prompt.plotThePoint');
    case 'translation': {
      const dx = q.delta?.dx ?? 0;
      const dy = q.delta?.dy ?? 0;
      const sx = q.point?.x ?? 0;
      const sy = q.point?.y ?? 0;
      const hx = dx === 0 ? '' : `${Math.abs(dx)} ${t(dx > 0 ? 'shapes.prompt.right' : 'shapes.prompt.left')}`;
      const hy = dy === 0 ? '' : `${Math.abs(dy)} ${t(dy > 0 ? 'shapes.prompt.up' : 'shapes.prompt.down')}`;
      const parts = [hx, hy].filter(Boolean).join(', ');
      return t('shapes.prompt.translate', { x: sx, y: sy, parts });
    }
    case 'angle-at-point':
      return t('shapes.prompt.missingAngle360');
    case 'angle-on-line':
      return t('shapes.prompt.missingAngle180');
    case 'angle-vertical':
      return t('shapes.prompt.verticallyOpposite');
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
  if (q.skill === 'name-3d') {
    return q.solid ?? '';
  }
  if (
    q.skill === 'count-sides' ||
    q.skill === 'count-faces' ||
    q.skill === 'count-edges' ||
    q.skill === 'count-vertices' ||
    q.skill === 'lines-of-symmetry'
  ) {
    return String(q.answer);
  }
  if (q.skill === 'angle-name' || q.skill === 'angle-name-reflex') {
    return q.category ?? '';
  }
  if (q.skill === 'angle-measure') {
    // ° (U+00B0) is in WinAnsi so this is safe in jsPDF Helvetica.
    return `${q.angle ?? 0}°`;
  }
  if (q.skill === 'coord-read' || q.skill === 'coord-plot' || q.skill === 'coord-four-quadrants') {
    const x = q.point?.x ?? 0;
    const y = q.point?.y ?? 0;
    return `(${x}, ${y})`;
  }
  if (q.skill === 'translation') {
    const x = (q.point?.x ?? 0) + (q.delta?.dx ?? 0);
    const y = (q.point?.y ?? 0) + (q.delta?.dy ?? 0);
    return `(${x}, ${y})`;
  }
  if (q.skill === 'angle-at-point' || q.skill === 'angle-on-line' || q.skill === 'angle-vertical') {
    return `${q.answer}°`;
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
 * Parse a "x,y" / "(x, y)" coordinate string. Strips parentheses, splits
 * on the first comma, and returns the integer pair. Returns null if the
 * input is malformed.
 */
export function parseCoord(input: string): { x: number; y: number } | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/^\(|\)$/g, '').trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/[,\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

/**
 * Check a typed/selected answer against the question. For name-2d the
 * input is the shape name string; for angle-name it's the category
 * string; for the numeric skills it's a number string (with optional
 * unit suffix); for coord skills it's "x,y".
 */
export function isAnswerCorrect(q: ShapeQuestion, typed: string): boolean {
  if (typeof typed !== 'string') return false;
  const trimmed = typed.trim().toLowerCase();
  if (!trimmed) return false;
  if (q.skill === 'name-2d') {
    return trimmed === (q.shape ?? '');
  }
  if (q.skill === 'name-3d') {
    return trimmed === (q.solid ?? '');
  }
  if (q.skill === 'angle-name' || q.skill === 'angle-name-reflex') {
    return trimmed === (q.category ?? '');
  }
  if (q.skill === 'angle-measure') {
    // Strip a trailing ° if the kid included it.
    const stripped = trimmed.replace(/°$/, '').trim();
    const n = Number(stripped);
    if (!Number.isFinite(n)) return false;
    // ±2° tolerance per spec — kids near-misses still get credit.
    return Math.abs(n - (q.angle ?? -9999)) <= 2;
  }
  if (
    q.skill === 'coord-read' ||
    q.skill === 'coord-plot' ||
    q.skill === 'translation' ||
    q.skill === 'coord-four-quadrants'
  ) {
    const got = parseCoord(typed);
    if (!got) return false;
    let want: { x: number; y: number };
    if (q.skill === 'translation') {
      want = {
        x: (q.point?.x ?? 0) + (q.delta?.dx ?? 0),
        y: (q.point?.y ?? 0) + (q.delta?.dy ?? 0),
      };
    } else {
      want = { x: q.point?.x ?? 0, y: q.point?.y ?? 0 };
    }
    return got.x === want.x && got.y === want.y;
  }
  if (q.skill === 'angle-at-point' || q.skill === 'angle-on-line' || q.skill === 'angle-vertical') {
    const stripped = trimmed.replace(/°$/, '').trim();
    const n = Number(stripped);
    if (!Number.isFinite(n)) return false;
    return n === q.answer;
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
  // count-* / perimeter-rect / area-rect / lines-of-symmetry — integer compare.
  return n === q.answer;
}

/**
 * Pick three wrong solid-name distractors for a name-3d multiple-choice
 * question. Mirrors pickNameDistractors but for solids.
 */
export function pickSolidDistractors(correct: SolidKind, n = 3): SolidKind[] {
  const pool = SOLID_KIND_OPTIONS.filter(s => s !== correct);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/** Categorise an angle in degrees (supports reflex). */
export function categoriseAngleReflex(deg: number): AngleCategoryReflex {
  if (deg === 90) return 'right';
  if (deg < 90) return 'acute';
  if (deg < 180) return 'obtuse';
  return 'reflex';
}

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: ShapeQuestion, difficulty: Difficulty): string[] {
  const s = answerString(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !isAnswerCorrect(q, c));
}
