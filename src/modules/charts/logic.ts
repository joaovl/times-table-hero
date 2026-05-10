// Charts module — chart-reading practice.
//
// v1 scope: kid reads a bar chart and types a numeric answer for one of three
// bar-chart skills (read-bar, compare-bar, total-bar). v2 adds two pie-chart
// skills (read-pie — identify largest/smallest slice; pie-fraction — express a
// slice as a fraction of the whole). Line charts and word-problems remain
// deferred to v3.

export type ChartSkill =
  | 'read-bar'
  | 'compare-bar'
  | 'total-bar'
  | 'read-pie'
  | 'pie-fraction';

export const CHART_SKILL_OPTIONS: ReadonlyArray<ChartSkill> = [
  'read-bar',
  'compare-bar',
  'total-bar',
  'read-pie',
  'pie-fraction',
];

export const CHART_SKILL_LABEL: Record<ChartSkill, string> = {
  'read-bar': 'read-bar',
  'compare-bar': 'compare-bar',
  'total-bar': 'total-bar',
  'read-pie': 'read-pie',
  'pie-fraction': 'pie-fraction',
};

/** Pie-chart skills always use 4 categories regardless of the bar-chart setting. */
export const PIE_NUM_CATEGORIES = 4;

/** Denominators kid-friendly enough that slice fractions reduce cleanly. */
const PIE_DENOMINATORS = [8, 10, 12] as const;

export function isPieSkill(skill: ChartSkill): boolean {
  return skill === 'read-pie' || skill === 'pie-fraction';
}

export const CHART_MAX_VALUE_OPTIONS = [10, 50, 100, 1000] as const;
export const CHART_NUM_CATEGORIES_OPTIONS = [4, 5, 6, 7] as const;

export interface ChartCategory {
  label: string;
  value: number;
}

/** Reduced fraction. */
export interface Fraction {
  num: number;
  den: number;
}

export type ExpectedKind = 'number' | 'label' | 'fraction';

export interface ChartQuestion {
  skill: ChartSkill;
  /**
   * 4..7 categories for bar charts, exactly 4 for pie charts. Each `value`
   * is an integer count. For pie charts the values are slice counts and sum
   * to the pie denominator.
   */
  categories: ChartCategory[];
  /**
   * Indices into `categories` the question references.
   *   read-bar: exactly 1 target.
   *   compare-bar: exactly 2 distinct targets.
   *   total-bar: every index (0..n-1).
   *   read-pie: exactly 1 target (largest or smallest slice).
   *   pie-fraction: exactly 1 target (the highlighted slice).
   */
  targets: number[];
  /** Human-readable prompt the kid sees, e.g. "How many votes did Tuesday get?". */
  prompt: string;
  /** Expected numeric answer (used by bar-chart skills). */
  answer: number;
  /** Kind of expected answer. Defaults to 'number'. */
  expectedKind?: ExpectedKind;
  /** Set when expectedKind === 'label' (read-pie). */
  expectedLabel?: string;
  /** Set when expectedKind === 'fraction' (pie-fraction), already reduced. */
  expectedFraction?: Fraction;
  /** Plain noun for the y-axis / prompt unit, e.g. "votes", "apples". */
  unit: string;
}

export interface ChartSettings {
  /** Non-empty subset of ChartSkill. Default ['read-bar']. */
  skills: ChartSkill[];
  /** Bar values are drawn uniformly from 1..maxValue. (Bar-chart skills only.) */
  maxValue: number;
  /** Number of categories on every BAR chart (4..7). Pie charts are always 4. */
  numCategories: number;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// -----------------------------------------------------------------------------
// Kid-friendly label pools. Each pool defines its own canonical "unit" so the
// prompts read naturally. ASCII only — keeps PDF rendering encoding-safe.

interface LabelPool {
  readonly name: string;
  readonly unit: string;
  readonly labels: ReadonlyArray<string>;
}

const POOLS: ReadonlyArray<LabelPool> = [
  {
    name: 'days',
    unit: 'votes',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    name: 'fruit',
    unit: 'apples',
    labels: ['Apple', 'Banana', 'Cherry', 'Date', 'Grape', 'Kiwi', 'Mango'],
  },
  {
    name: 'animals',
    unit: 'animals',
    labels: ['Cat', 'Dog', 'Cow', 'Pig', 'Hen', 'Goat', 'Duck'],
  },
  {
    name: 'sports',
    unit: 'fans',
    labels: ['Football', 'Tennis', 'Cricket', 'Rugby', 'Hockey', 'Golf', 'Swim'],
  },
  {
    name: 'kids',
    unit: 'stickers',
    labels: ['Amy', 'Ben', 'Cal', 'Dan', 'Eve', 'Finn', 'Gus'],
  },
  {
    name: 'colors',
    unit: 'votes',
    labels: ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange'],
  },
];

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPool(prevName: string | null): LabelPool {
  // Cycle so consecutive questions tend to use different pools.
  if (POOLS.length <= 1 || !prevName) return pick(POOLS);
  const others = POOLS.filter(p => p.name !== prevName);
  return pick(others);
}

function pickLabels(pool: LabelPool, count: number): string[] {
  // Sample without replacement; if `count` exceeds the pool, cycle.
  const out: string[] = [];
  const remaining = [...pool.labels];
  while (out.length < count) {
    if (remaining.length === 0) {
      // Refill (extremely unlikely with 7-label pools and count <= 7).
      remaining.push(...pool.labels);
    }
    const idx = Math.floor(Math.random() * remaining.length);
    out.push(remaining.splice(idx, 1)[0]);
  }
  return out;
}

function randomCategories(
  pool: LabelPool,
  numCategories: number,
  maxValue: number,
): ChartCategory[] {
  const labels = pickLabels(pool, numCategories);
  return labels.map(label => ({ label, value: randInt(1, maxValue) }));
}

function buildReadBar(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
} {
  const target = randInt(0, categories.length - 1);
  const cat = categories[target];
  return {
    targets: [target],
    prompt: `How many ${unit} did ${cat.label} get?`,
    answer: cat.value,
  };
}

function buildCompareBar(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
} {
  // Two distinct targets.
  const a = randInt(0, categories.length - 1);
  let b = randInt(0, categories.length - 1);
  while (b === a) b = randInt(0, categories.length - 1);
  const catA = categories[a];
  const catB = categories[b];
  // Ask "how many more X than Y" with X being the larger so the answer is
  // a non-negative magnitude. Ties: keep order, answer is 0.
  const xIdx = catA.value >= catB.value ? a : b;
  const yIdx = catA.value >= catB.value ? b : a;
  const x = categories[xIdx];
  const y = categories[yIdx];
  return {
    targets: [xIdx, yIdx],
    prompt: `How many more ${unit} did ${x.label} get than ${y.label}?`,
    answer: Math.abs(x.value - y.value),
  };
}

function buildTotalBar(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
} {
  const sum = categories.reduce((acc, c) => acc + c.value, 0);
  return {
    targets: categories.map((_, i) => i),
    prompt: `What is the total number of ${unit}?`,
    answer: sum,
  };
}

// -----------------------------------------------------------------------------
// Pie helpers.

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function reduceFraction(num: number, den: number): Fraction {
  if (den === 0) return { num: 0, den: 1 };
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/**
 * Pick 4 positive integer slice sizes summing to `total`. Ensures every slice
 * is at least 1 so all four categories are visible on the chart.
 */
function pickSliceSizes(total: number): number[] {
  // Use stars-and-bars-like sampling: random integer compositions of `total`
  // into 4 parts each >= 1. Reject any composition where the largest and
  // smallest slice tie — picking "the biggest slice" is unambiguous only when
  // there's a clear winner. Same logic for the smallest. We loop until we
  // find a clean composition (typically < 5 attempts).
  for (let attempt = 0; attempt < 50; attempt++) {
    const parts: number[] = [1, 1, 1, 1];
    let remaining = total - 4;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * 4);
      parts[idx] += 1;
      remaining -= 1;
    }
    const max = Math.max(...parts);
    const min = Math.min(...parts);
    const maxCount = parts.filter(p => p === max).length;
    const minCount = parts.filter(p => p === min).length;
    // Need a unique max AND a unique min so both read-pie variants are sound.
    if (maxCount === 1 && minCount === 1) return parts;
  }
  // Fallback: a hand-tuned composition with a clear max and min.
  // e.g. total=12 → [5,3,2,2] — but we need a unique min too. Use [6,3,2,1] family.
  // Scale to total: pick from a known good pattern.
  if (total === 8) return [4, 2, 1, 1].sort(() => Math.random() - 0.5);
  if (total === 10) return [5, 2, 2, 1].sort(() => Math.random() - 0.5);
  return [6, 3, 2, 1].sort(() => Math.random() - 0.5); // 12
}

function randomPieCategories(pool: LabelPool): { categories: ChartCategory[]; total: number } {
  const labels = pickLabels(pool, PIE_NUM_CATEGORIES);
  const total = pick(PIE_DENOMINATORS);
  const sizes = pickSliceSizes(total);
  const categories = labels.map((label, i) => ({ label, value: sizes[i] }));
  return { categories, total };
}

function buildReadPie(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
  expectedLabel: string;
} {
  // 50/50 split between asking for the largest vs smallest slice.
  const askLargest = Math.random() < 0.5;
  let pickedIdx = 0;
  let pickedValue = categories[0].value;
  for (let i = 1; i < categories.length; i++) {
    const v = categories[i].value;
    if (askLargest ? v > pickedValue : v < pickedValue) {
      pickedValue = v;
      pickedIdx = i;
    }
  }
  const cat = categories[pickedIdx];
  const which = askLargest ? 'biggest' : 'smallest';
  return {
    targets: [pickedIdx],
    prompt: `Which slice is the ${which} in this pie of ${unit}?`,
    // `answer` stays numeric (the slice count) for backwards compatibility,
    // but read-pie uses `expectedLabel` for grading.
    answer: cat.value,
    expectedLabel: cat.label,
  };
}

function buildPieFraction(
  categories: ChartCategory[],
  total: number,
  unit: string,
): {
  targets: number[];
  prompt: string;
  answer: number;
  expectedFraction: Fraction;
} {
  const idx = randInt(0, categories.length - 1);
  const cat = categories[idx];
  const frac = reduceFraction(cat.value, total);
  return {
    targets: [idx],
    prompt: `What fraction of the ${unit} pie is the highlighted slice?`,
    answer: cat.value,
    expectedFraction: frac,
  };
}

function buildQuestion(
  skill: ChartSkill,
  numCategories: number,
  maxValue: number,
  prevPoolName: string | null,
): { question: ChartQuestion; poolName: string } {
  const pool = pickPool(prevPoolName);

  if (skill === 'read-pie' || skill === 'pie-fraction') {
    const { categories, total } = randomPieCategories(pool);
    const unit = pool.unit;
    if (skill === 'read-pie') {
      const built = buildReadPie(categories, unit);
      return {
        question: {
          skill,
          categories,
          targets: built.targets,
          prompt: built.prompt,
          answer: built.answer,
          expectedKind: 'label',
          expectedLabel: built.expectedLabel,
          unit,
        },
        poolName: pool.name,
      };
    }
    const built = buildPieFraction(categories, total, unit);
    return {
      question: {
        skill,
        categories,
        targets: built.targets,
        prompt: built.prompt,
        answer: built.answer,
        expectedKind: 'fraction',
        expectedFraction: built.expectedFraction,
        unit,
      },
      poolName: pool.name,
    };
  }

  const categories = randomCategories(pool, numCategories, maxValue);
  const unit = pool.unit;
  const built =
    skill === 'read-bar'
      ? buildReadBar(categories, unit)
      : skill === 'compare-bar'
      ? buildCompareBar(categories, unit)
      : buildTotalBar(categories, unit);
  return {
    question: {
      skill,
      categories,
      targets: built.targets,
      prompt: built.prompt,
      answer: built.answer,
      expectedKind: 'number',
      unit,
    },
    poolName: pool.name,
  };
}

export function generateChartQuestions(
  settings: ChartSettings,
  count: number,
): ChartQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['read-bar'] as ChartSkill[]);
  const numCategories = clamp(settings.numCategories, 4, 7);
  const maxValue = Math.max(1, settings.maxValue);
  const out: ChartQuestion[] = [];
  let prevPool: string | null = null;
  for (let i = 0; i < count; i++) {
    const skill = pick(skills);
    const { question, poolName } = buildQuestion(skill, numCategories, maxValue, prevPool);
    out.push(question);
    prevPool = poolName;
  }
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Parse a typed numeric answer. Accepts an optional leading minus, but the
 * answer must be a non-negative integer (all bar-chart skills produce >= 0).
 * Strips leading/trailing whitespace.
 */
export function parseChartAnswer(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Reject anything that isn't an integer literal (digits, optional - sign).
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Parse a typed fraction like "1/4". Strips whitespace, requires positive
 * integers on both sides, denominator > 0. Returns reduced form.
 */
export function parseFractionAnswer(raw: string): Fraction | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const den = parseInt(m[2], 10);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return reduceFraction(num, den);
}

/**
 * Express the user's typed answer for any chart skill. The shape depends on
 * the question's `expectedKind`:
 *   number   → `typed` parsed as integer; bar-chart skills.
 *   label    → `typed` is a category label (already chosen via MC).
 *   fraction → `typed` is "n/d" or { num, den } already.
 */
export function isAnswerCorrect(
  q: ChartQuestion,
  typed: string | Fraction,
): boolean {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') {
    if (typeof typed !== 'string') return false;
    return typed.trim() === (q.expectedLabel ?? '');
  }
  if (kind === 'fraction') {
    const expected = q.expectedFraction;
    if (!expected) return false;
    const got: Fraction | null =
      typeof typed === 'string' ? parseFractionAnswer(typed) : reduceFraction(typed.num, typed.den);
    if (!got) return false;
    return got.num === expected.num && got.den === expected.den;
  }
  // number
  if (typeof typed !== 'string') return false;
  const parsed = parseChartAnswer(typed);
  if (parsed === null) return false;
  return parsed === q.answer;
}

/**
 * Round the chart's data max up to a friendly axis maximum. Used by both the
 * on-screen SVG and the PDF renderer so they agree.
 */
export function axisMax(dataMax: number): number {
  if (dataMax <= 0) return 10;
  if (dataMax <= 10) return Math.ceil(dataMax / 2) * 2; // round up to 2s for small ranges
  if (dataMax <= 100) return Math.ceil(dataMax / 10) * 10;
  if (dataMax <= 1000) return Math.ceil(dataMax / 100) * 100;
  return Math.ceil(dataMax / 1000) * 1000;
}

export function axisTickCount(axisHigh: number): number {
  // 5 gridlines is the sweet spot for chart cells of this size.
  if (axisHigh <= 10) return 5;
  if (axisHigh <= 100) return 5;
  return 5;
}

// -----------------------------------------------------------------------------
// Pie geometry helpers — shared by SVG renderer and PDF renderer so the two
// agree on slice angles.

/**
 * Cumulative slice arcs for the given category values. The first slice starts
 * at the top of the pie (12 o'clock) and runs clockwise. Angles are in radians.
 */
export interface PieSlice {
  startAngle: number;
  endAngle: number;
  /** Mid-angle for label positioning. */
  midAngle: number;
  /** Slice count (categories[i].value). */
  value: number;
}

/** Build slice arcs from category values; total defaults to sum of values. */
export function buildPieSlices(values: number[], total?: number): PieSlice[] {
  const sum = total ?? values.reduce((a, b) => a + b, 0);
  const out: PieSlice[] = [];
  // Start at the top (12 o'clock = -PI/2) and go clockwise.
  let acc = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const span = (values[i] / sum) * Math.PI * 2;
    const start = acc;
    const end = acc + span;
    out.push({ startAngle: start, endAngle: end, midAngle: (start + end) / 2, value: values[i] });
    acc = end;
  }
  return out;
}
