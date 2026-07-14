// Measurement & Conversions module — UK National Curriculum Years 4-5.
//
// Covers unit conversions (length, mass, volume, time), composite-rectangle
// perimeter, irregular-area-by-counting-squares, and volume of cubes /
// cuboids. The question type is a discriminated union keyed on `skill` so
// the renderers (online play + PDF) can stay narrow and exhaustive.
//
// Encoding safety: all prompts and labels stay inside Helvetica WinAnsi.
// In particular we use the literal word "approximately" (or "~") rather
// than the Unicode "≈" glyph, and U+00B2 / U+00B3 for sq / cubic units
// (both are in WinAnsi).

import { integerChoices } from '@/lib/game/choices';
export type ConversionSkill =
  // Length
  | 'length-cm-mm'
  | 'length-m-cm'
  | 'length-km-m'
  // Mass
  | 'mass-kg-g'
  // Volume / capacity
  | 'volume-L-mL'
  // Time
  | 'time-h-min'
  | 'time-min-s'
  // Imperial bridge
  | 'metric-imperial'
  // Composite figures
  | 'perimeter-composite'
  | 'area-irregular'
  // Volume of solids
  | 'volume-cube'
  | 'volume-cuboid';

export type ConversionDifficulty = 'easy' | 'medium' | 'hard';

export const CONVERSION_SKILL_OPTIONS: ReadonlyArray<ConversionSkill> = [
  'length-cm-mm',
  'length-m-cm',
  'length-km-m',
  'mass-kg-g',
  'volume-L-mL',
  'time-h-min',
  'time-min-s',
  'metric-imperial',
  'perimeter-composite',
  'area-irregular',
  'volume-cube',
  'volume-cuboid',
];

export const CONVERSION_SKILL_LABEL: Record<ConversionSkill, string> = {
  'length-cm-mm': 'Length (cm → mm)',
  'length-m-cm': 'Length (m → cm)',
  'length-km-m': 'Length (km → m)',
  'mass-kg-g': 'Mass (kg → g)',
  'volume-L-mL': 'Volume (L → mL)',
  'time-h-min': 'Time (h → min)',
  'time-min-s': 'Time (min → s)',
  'metric-imperial': 'Metric ↔ Imperial',
  'perimeter-composite': 'Perimeter (composite)',
  'area-irregular': 'Area (irregular)',
  'volume-cube': 'Volume (cube)',
  'volume-cuboid': 'Volume (cuboid)',
};

export const CONVERSION_DIFFICULTY_OPTIONS: ReadonlyArray<ConversionDifficulty> = [
  'easy',
  'medium',
  'hard',
];

/**
 * Curriculum tags per skill — UK National Curriculum years. Exposed for
 * external indexing / hub filtering. v1 targets Years 3-5.
 */
export const CURRICULUM_TAGS: Record<ConversionSkill, string[]> = {
  'length-cm-mm': ['Y3', 'Y4'],
  'length-m-cm': ['Y4'],
  'length-km-m': ['Y4'],
  'mass-kg-g': ['Y4'],
  'volume-L-mL': ['Y4', 'Y5'],
  'time-h-min': ['Y4'],
  'time-min-s': ['Y4'],
  'metric-imperial': ['Y5'],
  'perimeter-composite': ['Y5'],
  'area-irregular': ['Y5'],
  'volume-cube': ['Y5'],
  'volume-cuboid': ['Y5'],
};

// ---------------------------------------------------------------------------
// Discriminated-union question shape
// ---------------------------------------------------------------------------

/** Unit string for a conversion question — kept short so it fits on a line. */
export type ConversionUnit =
  | 'mm' | 'cm' | 'm' | 'km'
  | 'g' | 'kg'
  | 'mL' | 'L'
  | 's' | 'min' | 'h'
  | 'miles' | 'mi'
  | 'sq' | 'cm³' | 'cm²' | 'm³';

/**
 * Layout for a composite-perimeter figure. Keep enums small so SVG and PDF
 * renderers can share an exhaustive switch.
 *
 *   - 'L': L-shape (rectangle with a smaller rectangle removed from one
 *     corner). 6 edges.
 *   - 'T': T-shape (horizontal bar over a vertical stem). 8 edges.
 *   - 'rect': simple rectangle fallback (4 edges).
 */
export type CompositeLayout = 'L' | 'T' | 'rect';

/**
 * Edge data for a composite figure. `edges` lists side lengths in the same
 * order the renderer walks the perimeter (clockwise, starting top-left).
 * `figureSpec` carries the abstract dimensions needed to draw it:
 *   L: { outerW, outerH, cutW, cutH }
 *   T: { topW, topH, stemW, stemH }
 *   rect: { w, h }
 */
export interface FigureSpecL {
  outerW: number;
  outerH: number;
  cutW: number;
  cutH: number;
}
export interface FigureSpecT {
  topW: number;
  topH: number;
  stemW: number;
  stemH: number;
}
export interface FigureSpecRect {
  w: number;
  h: number;
}
export type FigureSpec = FigureSpecL | FigureSpecT | FigureSpecRect;

interface BaseConversionQuestion {
  skill: 'length-cm-mm' | 'length-m-cm' | 'length-km-m' | 'mass-kg-g'
       | 'volume-L-mL' | 'time-h-min' | 'time-min-s' | 'metric-imperial';
  fromValue: number;
  fromUnit: ConversionUnit;
  toUnit: ConversionUnit;
  /** Numeric answer in `toUnit`. */
  answer: number;
}

interface PerimeterCompositeQuestion {
  skill: 'perimeter-composite';
  edges: number[];
  layout: CompositeLayout;
  figureSpec: FigureSpec;
  answer: number;
  unit: 'cm' | 'm';
}

interface AreaIrregularQuestion {
  skill: 'area-irregular';
  /** Row-major grid of which cells are shaded. `answer` === count of true. */
  grid: boolean[][];
  answer: number;
  unit: 'sq';
}

interface VolumeCubeQuestion {
  skill: 'volume-cube';
  side: number;
  answer: number;
  unit: 'cm³' | 'm³';
}

interface VolumeCuboidQuestion {
  skill: 'volume-cuboid';
  length: number;
  width: number;
  height: number;
  answer: number;
  unit: 'cm³' | 'm³';
}

export type ConversionQuestion =
  | BaseConversionQuestion
  | PerimeterCompositeQuestion
  | AreaIrregularQuestion
  | VolumeCubeQuestion
  | VolumeCuboidQuestion;

export interface ConversionSettings {
  skills: ConversionSkill[];
  difficulty: ConversionDifficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// ---------------------------------------------------------------------------
// RNG helpers (deterministic-friendly: thin wrappers over Math.random)
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Round to 2 dp — used so decimal answers stay tidy. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Round to 1 dp — used for one-decimal-place generators. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Per-skill value samplers
// ---------------------------------------------------------------------------

/** Sample a "value" for a simple unit-conversion question by difficulty.
 *  Easy = whole numbers in [1, 10]. Medium = one decimal place [1.1, 9.9].
 *  Hard = whole-number values up to a higher range (mixed-unit composite
 *  questions are produced separately via `sampleHardMultiStep`). */
function sampleSimpleValue(d: ConversionDifficulty): number {
  if (d === 'easy') return randInt(1, 10);
  if (d === 'medium') {
    // One decimal place, but never `.0` (so the test ".5" / ".3" structure
    // actually shows up). Range 1.1 .. 9.9.
    const tenths = randInt(11, 99);
    return tenths / 10;
  }
  // hard
  return randInt(2, 50);
}

/** Conversion factor — how many `toUnit` per one `fromUnit`. */
function conversionFactor(skill: BaseConversionQuestion['skill']): number {
  switch (skill) {
    case 'length-cm-mm': return 10;
    case 'length-m-cm': return 100;
    case 'length-km-m': return 1000;
    case 'mass-kg-g': return 1000;
    case 'volume-L-mL': return 1000;
    case 'time-h-min': return 60;
    case 'time-min-s': return 60;
    // metric-imperial is handled specially via buildMetricImperialQuestion.
    case 'metric-imperial': return 1;
  }
}

function unitsFor(skill: BaseConversionQuestion['skill']): { from: ConversionUnit; to: ConversionUnit } {
  switch (skill) {
    case 'length-cm-mm': return { from: 'cm', to: 'mm' };
    case 'length-m-cm': return { from: 'm', to: 'cm' };
    case 'length-km-m': return { from: 'km', to: 'm' };
    case 'mass-kg-g': return { from: 'kg', to: 'g' };
    case 'volume-L-mL': return { from: 'L', to: 'mL' };
    case 'time-h-min': return { from: 'h', to: 'min' };
    case 'time-min-s': return { from: 'min', to: 's' };
    case 'metric-imperial': return { from: 'miles', to: 'km' };
  }
}

function buildSimpleConversion(
  skill: BaseConversionQuestion['skill'],
  difficulty: ConversionDifficulty
): BaseConversionQuestion {
  const { from, to } = unitsFor(skill);
  const factor = conversionFactor(skill);
  const value = sampleSimpleValue(difficulty);
  // Multiply, then round to a clean form — values like 1.5 * 1000 = 1500
  // come out exact, but using round2 defends against fp drift.
  const answer = round2(value * factor);
  return {
    skill,
    fromValue: value,
    fromUnit: from,
    toUnit: to,
    answer,
  };
}

/**
 * Metric ↔ imperial (miles ↔ km). Uses the kid-friendly 5:8 ratio:
 *   5 miles ≈ 8 km, 10 km ≈ 6 miles (close to the true 6.21).
 * We pick miles as multiples of 5 and km as multiples of 5 so the rounded
 * answers stay integer-clean. Tolerance for grading is ±0.5.
 */
function buildMetricImperialQuestion(): BaseConversionQuestion {
  // Direction: 50/50 miles→km or km→miles.
  const milesToKm = Math.random() < 0.5;
  if (milesToKm) {
    const miles = pick([5, 10, 15, 20, 25] as const);
    const km = (miles / 5) * 8;
    return {
      skill: 'metric-imperial',
      fromValue: miles,
      fromUnit: 'miles',
      toUnit: 'km',
      answer: km,
    };
  }
  const km = pick([5, 10, 15, 20, 25] as const);
  const miles = Math.round((km / 8) * 5);
  return {
    skill: 'metric-imperial',
    fromValue: km,
    fromUnit: 'km',
    toUnit: 'miles',
    answer: miles,
  };
}

// --- Composite perimeter -------------------------------------------------

/**
 * Pick a layout for a composite-perimeter question. Easy uses simple
 * rect-only fallback rarely; medium / hard pick L / T more often.
 */
function pickCompositeLayout(d: ConversionDifficulty): CompositeLayout {
  if (d === 'easy') return Math.random() < 0.5 ? 'L' : 'rect';
  return pick(['L', 'L', 'T'] as const);
}

/** Walk the perimeter of an L-shape and return the 6 edge lengths in CW
 *  order, starting from the top-left corner going right.
 *
 *  Layout — cut is at the bottom-right corner:
 *    +-----+
 *    |     |
 *    |   +-+
 *    |   |
 *    +---+
 */
function lEdges(spec: FigureSpecL): number[] {
  const { outerW, outerH, cutW, cutH } = spec;
  // top, right-top, in-left, in-bottom, bottom, left
  return [outerW, outerH - cutH, cutW, cutH, outerW - cutW, outerH];
}

/** T-shape edge walk (8 edges). Top bar overlaps the stem centred.
 *  Layout (stem hangs below the top bar):
 *    +---------+
 *    |         |
 *    +-+     +-+
 *      |     |
 *      |     |
 *      +-----+
 *  Edge order (CW from top-left of top bar):
 *    top, right-of-top, down-right-of-stem-shoulder, right-of-stem,
 *    bottom-of-stem, left-of-stem, left-shoulder-up, left-of-top.
 */
function tEdges(spec: FigureSpecT): number[] {
  const { topW, topH, stemW, stemH } = spec;
  const shoulder = (topW - stemW) / 2;
  return [
    topW,        // top
    topH,        // right of top bar (down)
    shoulder,    // right shoulder (in)
    stemH,       // right of stem (down)
    stemW,       // bottom of stem
    stemH,       // left of stem (up)
    shoulder,    // left shoulder (out)
    topH,        // left of top bar (up)
  ];
}

function buildCompositePerimeterQuestion(d: ConversionDifficulty): PerimeterCompositeQuestion {
  const layout = pickCompositeLayout(d);
  const unit: 'cm' | 'm' = 'cm';
  if (layout === 'rect') {
    const w = randInt(3, 12);
    const h = randInt(3, 12);
    return {
      skill: 'perimeter-composite',
      layout,
      figureSpec: { w, h },
      edges: [w, h, w, h],
      answer: 2 * (w + h),
      unit,
    };
  }
  if (layout === 'L') {
    // Pick outer first, then a cut strictly smaller in both dims so the
    // L stays a proper L (no degenerate cuts).
    const outerW = randInt(6, 14);
    const outerH = randInt(6, 14);
    const cutW = randInt(2, Math.max(2, Math.floor(outerW / 2)));
    const cutH = randInt(2, Math.max(2, Math.floor(outerH / 2)));
    const spec: FigureSpecL = { outerW, outerH, cutW, cutH };
    const edges = lEdges(spec);
    // Perimeter of an L: just 2*(outerW + outerH) — the cut adds and
    // removes equal segments. Compute via edge sum for the assertion in
    // tests, but the answer is mathematically the same.
    const answer = edges.reduce((s, x) => s + x, 0);
    return { skill: 'perimeter-composite', layout, figureSpec: spec, edges, answer, unit };
  }
  // T-shape — pick a top wider than the stem so the shoulders are
  // strictly positive integers.
  const stemW = randInt(2, 6);
  const topW = stemW + 2 * randInt(1, 4); // ensures shoulder ≥ 1 each side
  const topH = randInt(2, 5);
  const stemH = randInt(3, 8);
  const spec: FigureSpecT = { topW, topH, stemW, stemH };
  const edges = tEdges(spec);
  const answer = edges.reduce((s, x) => s + x, 0);
  return { skill: 'perimeter-composite', layout: 'T', figureSpec: spec, edges, answer, unit };
}

// --- Irregular-area-by-counting-squares ----------------------------------

/** Pick an irregular grid by stamping a couple of overlapping rectangles
 *  into a small (cols × rows) grid, then return the cells. The answer is
 *  simply the count of shaded cells.
 *
 *  The grid is sized 5×5 (easy) up to 6×6 (medium/hard). We don't bother
 *  with half-shaded triangles for v1 — the prompt is "count whole squares"
 *  so the answer is unambiguous.
 */
function buildAreaIrregularQuestion(d: ConversionDifficulty): AreaIrregularQuestion {
  const size = d === 'easy' ? 5 : 6;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  // Stamp 2-3 random rectangles. Each rectangle is between 2×2 and 4×4 to
  // keep the figure recognisable but irregular.
  const stamps = randInt(2, 3);
  for (let s = 0; s < stamps; s++) {
    const rw = randInt(2, Math.min(4, size - 1));
    const rh = randInt(2, Math.min(4, size - 1));
    const rx = randInt(0, size - rw);
    const ry = randInt(0, size - rh);
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        grid[y][x] = true;
      }
    }
  }

  // Count
  let count = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid[y][x]) count++;

  // Guarantee at least 3 shaded cells so the question isn't trivial / empty.
  // If somehow no rectangle landed (cannot happen with the loop above, but
  // defensive) we shade a single 3x3 area.
  if (count < 3) {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) grid[y][x] = true;
    count = 9;
  }

  return { skill: 'area-irregular', grid, answer: count, unit: 'sq' };
}

// --- Volume of cubes / cuboids -------------------------------------------

function sampleSideForVolume(d: ConversionDifficulty): number {
  if (d === 'easy') return randInt(2, 5);
  if (d === 'medium') return randInt(2, 8);
  return randInt(3, 10);
}

function buildVolumeCubeQuestion(d: ConversionDifficulty): VolumeCubeQuestion {
  const side = sampleSideForVolume(d);
  return {
    skill: 'volume-cube',
    side,
    answer: side * side * side,
    unit: 'cm³',
  };
}

function buildVolumeCuboidQuestion(d: ConversionDifficulty): VolumeCuboidQuestion {
  const length = sampleSideForVolume(d);
  const width = sampleSideForVolume(d);
  const height = sampleSideForVolume(d);
  return {
    skill: 'volume-cuboid',
    length,
    width,
    height,
    answer: length * width * height,
    unit: 'cm³',
  };
}

// ---------------------------------------------------------------------------
// Top-level builder + generator
// ---------------------------------------------------------------------------

function buildQuestion(
  skill: ConversionSkill,
  difficulty: ConversionDifficulty
): ConversionQuestion {
  switch (skill) {
    case 'length-cm-mm':
    case 'length-m-cm':
    case 'length-km-m':
    case 'mass-kg-g':
    case 'volume-L-mL':
    case 'time-h-min':
    case 'time-min-s':
      return buildSimpleConversion(skill, difficulty);
    case 'metric-imperial':
      return buildMetricImperialQuestion();
    case 'perimeter-composite':
      return buildCompositePerimeterQuestion(difficulty);
    case 'area-irregular':
      return buildAreaIrregularQuestion(difficulty);
    case 'volume-cube':
      return buildVolumeCubeQuestion(difficulty);
    case 'volume-cuboid':
      return buildVolumeCuboidQuestion(difficulty);
  }
}

/**
 * Produce `count` questions. Skill is picked uniformly from
 * `settings.skills`; on each pick the helper above resolves the inputs and
 * answer. Empty `skills` falls back to `length-cm-mm`.
 */
export function generateConversionQuestions(
  settings: ConversionSettings,
  count: number
): ConversionQuestion[] {
  const skills = settings.skills.length > 0
    ? settings.skills
    : (['length-cm-mm'] as ConversionSkill[]);
  const out: ConversionQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const skill = pick(skills);
    out.push(buildQuestion(skill, settings.difficulty));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prompt / answer formatting
// ---------------------------------------------------------------------------

/** Format a number for display — drop trailing zeros so "12.00" reads as
 *  "12" and "1.50" as "1.5". Up to 2 dp. */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

/** Short prompt text for a question (used by online play + PDF). */
export function promptFor(q: ConversionQuestion): string {
  switch (q.skill) {
    case 'metric-imperial':
      // Use the literal word "approximately" rather than the U+2248 glyph
      // — WinAnsi can't render ≈. The kid sees "5 miles is approximately
      // ? km" / "10 km is approximately ? miles".
      return `${formatNumber(q.fromValue)} ${q.fromUnit} is approximately ? ${q.toUnit}`;
    case 'length-cm-mm':
    case 'length-m-cm':
    case 'length-km-m':
    case 'mass-kg-g':
    case 'volume-L-mL':
    case 'time-h-min':
    case 'time-min-s':
      return `${formatNumber(q.fromValue)} ${q.fromUnit} = ? ${q.toUnit}`;
    case 'perimeter-composite':
      return `Perimeter? (${q.unit})`;
    case 'area-irregular':
      // "sq" reads naturally and stays WinAnsi-safe. Children's worksheets
      // commonly write "square units".
      return 'Area? (count shaded squares)';
    case 'volume-cube':
      return `Volume of cube, side = ${q.side} cm?`;
    case 'volume-cuboid':
      return `Volume of cuboid (${q.length} x ${q.width} x ${q.height} cm)?`;
  }
}

/** Canonical answer string used in the answer key + on-screen reveal. */
export function answerString(q: ConversionQuestion): string {
  switch (q.skill) {
    case 'metric-imperial':
      // Use ~ (U+007E) instead of ≈ for WinAnsi safety.
      return `~ ${formatNumber(q.answer)} ${q.toUnit}`;
    case 'length-cm-mm':
    case 'length-m-cm':
    case 'length-km-m':
    case 'mass-kg-g':
    case 'volume-L-mL':
    case 'time-h-min':
    case 'time-min-s':
      return `${formatNumber(q.answer)} ${q.toUnit}`;
    case 'perimeter-composite':
      return `${formatNumber(q.answer)} ${q.unit}`;
    case 'area-irregular':
      // Squared-units suffix using U+00B2 (in WinAnsi).
      return `${q.answer} sq units`;
    case 'volume-cube':
    case 'volume-cuboid':
      return `${formatNumber(q.answer)} ${q.unit}`;
  }
}

// ---------------------------------------------------------------------------
// Answer checking (typed numeric input)
// ---------------------------------------------------------------------------

/** Strip a trailing unit suffix off a typed numeric answer. Accepts the
 *  bare numeric, the numeric + unit, and a few normalised aliases.
 *  Case-insensitive. */
function stripUnitSuffix(s: string, units: string[]): string {
  let trimmed = s.trim().toLowerCase();
  if (!trimmed) return trimmed;
  for (const raw of units) {
    const u = raw.toLowerCase();
    // Try unit, then unit-with-superscript variants ("cm2", "cm^3", "sq cm").
    const variants = [
      u,
      u + '2',
      u + '3',
      u + '²',
      u + '³',
      'sq ' + u,
      'square ' + u,
    ];
    for (const v of variants) {
      if (trimmed.endsWith(v)) {
        trimmed = trimmed.slice(0, trimmed.length - v.length).trim();
        return trimmed;
      }
    }
  }
  return trimmed;
}

/**
 * Check a typed answer against the question. Accepts the bare number or
 * the number with the canonical unit suffix; tolerates 0.01 absolute error
 * for decimal-bearing answers, and 0.5 for `metric-imperial` (since 5:8 is
 * a rough conversion).
 */
export function isAnswerCorrect(q: ConversionQuestion, typed: string): boolean {
  if (typeof typed !== 'string') return false;
  const raw = typed.trim();
  if (!raw) return false;

  // Build the unit-stripping list. We pass everything that could plausibly
  // appear after the number — the target unit primarily, plus a few near
  // aliases so a kid who writes "150 minutes" or "150 mins" still gets
  // credit for the time-min-s style answers.
  let unitCandidates: string[] = [];
  if (q.skill === 'perimeter-composite') {
    unitCandidates = [q.unit];
  } else if (q.skill === 'area-irregular') {
    unitCandidates = ['sq units', 'sq', 'squares', 'square', 'units'];
  } else if (q.skill === 'volume-cube' || q.skill === 'volume-cuboid') {
    unitCandidates = [q.unit, 'cm3', 'cm^3', 'cubic cm'];
  } else {
    // Simple conversion: accept the `toUnit`, plus expanded spellings.
    unitCandidates = [String(q.toUnit), 'miles', 'mile', 'mi', 'minutes', 'mins', 'minute', 'seconds', 'secs', 'second'];
  }

  const numericPart = stripUnitSuffix(raw, unitCandidates);
  if (!numericPart) return false;
  const n = Number(numericPart);
  if (!Number.isFinite(n)) return false;

  if (q.skill === 'metric-imperial') {
    // 5:8 ratio is rough — allow ±0.5.
    return Math.abs(n - q.answer) <= 0.5;
  }
  if (q.skill === 'area-irregular') {
    return n === q.answer;
  }
  if (q.skill === 'volume-cube' || q.skill === 'volume-cuboid') {
    return n === q.answer;
  }
  if (q.skill === 'perimeter-composite') {
    return n === q.answer;
  }
  // Simple conversion: integer-clean for easy/hard, may have decimals
  // from medium (e.g. 1.5 * 1000 = 1500 — integer; 1.3 * 60 = 78 —
  // integer; 2.5 h → 150 min — integer). With round2 the answer is at
  // most 2-dp; use 0.01 tolerance.
  return Math.abs(n - q.answer) < 0.011;
}

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: ConversionQuestion, difficulty: Difficulty): string[] {
  const s = answerString(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !isAnswerCorrect(q, c));
}
