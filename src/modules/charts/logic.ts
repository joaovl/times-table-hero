// Charts module — chart-reading practice.
//
// v1 scope: bar-chart skills (read-bar, compare-bar, total-bar).
// v2 adds pie-chart skills (read-pie, pie-fraction).
// v3 adds Y5-coverage skills: line graphs (read-line, line-trend, line-max),
// timetables (timetable-read, timetable-duration) and multi-step bar problems
// (multi-step-bar).

import { integerChoices, numericChoicesWithNone } from '@/lib/game/choices';

export type ChartSkill =
  | 'read-bar'
  | 'compare-bar'
  | 'total-bar'
  | 'read-pie'
  | 'pie-fraction'
  | 'read-line'
  | 'line-trend'
  | 'line-max'
  | 'timetable-read'
  | 'timetable-duration'
  | 'multi-step-bar';

export const CHART_SKILL_OPTIONS: ReadonlyArray<ChartSkill> = [
  'read-bar',
  'compare-bar',
  'total-bar',
  'read-pie',
  'pie-fraction',
  'read-line',
  'line-trend',
  'line-max',
  'timetable-read',
  'timetable-duration',
  'multi-step-bar',
];

export const CHART_SKILL_LABEL: Record<ChartSkill, string> = {
  'read-bar': 'read-bar',
  'compare-bar': 'compare-bar',
  'total-bar': 'total-bar',
  'read-pie': 'read-pie',
  'pie-fraction': 'pie-fraction',
  'read-line': 'read-line',
  'line-trend': 'line-trend',
  'line-max': 'line-max',
  'timetable-read': 'timetable',
  'timetable-duration': 'duration',
  'multi-step-bar': 'multi-step',
};

/**
 * UK National Curriculum tags. Exposed so the orchestrator (or a future
 * curriculum-tagging UI) can group skills by year group.
 */
export const CURRICULUM_TAGS: Record<ChartSkill, { year: 'Y3' | 'Y4' | 'Y5'; strand: string }> = {
  'read-bar': { year: 'Y3', strand: 'Statistics' },
  'compare-bar': { year: 'Y3', strand: 'Statistics' },
  'total-bar': { year: 'Y4', strand: 'Statistics' },
  'read-pie': { year: 'Y4', strand: 'Statistics' },
  'pie-fraction': { year: 'Y5', strand: 'Statistics' },
  'read-line': { year: 'Y4', strand: 'Statistics' },
  'line-trend': { year: 'Y5', strand: 'Statistics' },
  'line-max': { year: 'Y4', strand: 'Statistics' },
  'timetable-read': { year: 'Y5', strand: 'Statistics' },
  'timetable-duration': { year: 'Y5', strand: 'Statistics' },
  'multi-step-bar': { year: 'Y5', strand: 'Statistics' },
};

/** Pie-chart skills always use 4 categories regardless of the bar-chart setting. */
export const PIE_NUM_CATEGORIES = 4;

/** Denominators kid-friendly enough that slice fractions reduce cleanly. */
const PIE_DENOMINATORS = [8, 10, 12] as const;

/** Line-chart skills always plot 5..7 points. */
export const LINE_POINT_COUNTS = [5, 6, 7] as const;

/** Trains/buses for the timetable skills. Always 3 stations, 3 services. */
export const TIMETABLE_STATIONS = 3;
export const TIMETABLE_SERVICES = 3;

export function isPieSkill(skill: ChartSkill): boolean {
  return skill === 'read-pie' || skill === 'pie-fraction';
}

export function isLineSkill(skill: ChartSkill): boolean {
  return skill === 'read-line' || skill === 'line-trend' || skill === 'line-max';
}

export function isTimetableSkill(skill: ChartSkill): boolean {
  return skill === 'timetable-read' || skill === 'timetable-duration';
}

export type ChartType = 'bar' | 'pie' | 'line' | 'timetable';

export function chartTypeFor(skill: ChartSkill): ChartType {
  if (isPieSkill(skill)) return 'pie';
  if (isLineSkill(skill)) return 'line';
  if (isTimetableSkill(skill)) return 'timetable';
  return 'bar';
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

export type ExpectedKind = 'number' | 'label' | 'fraction' | 'trend' | 'time';

export type TrendAnswer = 'rising' | 'falling' | 'flat';

/** Multi-step bar query — pick two bars, apply op. */
export interface MultiStepQuery {
  op: 'add' | 'sub' | 'diff';
  aIdx: number;
  bIdx: number;
}

/** Timetable query — pick a from/to station and a service row. */
export interface TimetableQuery {
  fromIdx: number;
  toIdx: number;
  /** Which service row to inspect. */
  serviceIdx: number;
  question: 'arrival' | 'duration';
}

export interface ChartQuestion {
  skill: ChartSkill;
  /** Discriminator for the renderer to pick the right chart primitive. */
  chartType?: ChartType;
  /**
   * 4..7 categories for bar charts, exactly 4 for pie charts, 5..7 points
   * for line charts. Each `value` is an integer count. For pie charts the
   * values are slice counts and sum to the pie denominator. For timetable
   * skills this is empty — see `stations` / `times` instead.
   */
  categories: ChartCategory[];
  /**
   * Indices into `categories` the question references.
   *   read-bar: exactly 1 target.
   *   compare-bar: exactly 2 distinct targets.
   *   total-bar: every index (0..n-1).
   *   read-pie: exactly 1 target (largest or smallest slice).
   *   pie-fraction: exactly 1 target (the highlighted slice).
   *   read-line: exactly 1 target (the queried point).
   *   line-trend: empty.
   *   line-max: exactly 1 target (the largest point).
   *   multi-step-bar: exactly 2 distinct targets (a, b).
   *   timetable-*: empty.
   */
  targets: number[];
  /** Human-readable prompt the kid sees, e.g. "How many votes did Tuesday get?". */
  prompt: string;
  /** Expected numeric answer (used by numeric skills). */
  answer: number;
  /** Kind of expected answer. Defaults to 'number'. */
  expectedKind?: ExpectedKind;
  /** Set when expectedKind === 'label'. */
  expectedLabel?: string;
  /** Set when expectedKind === 'fraction' (pie-fraction), already reduced. */
  expectedFraction?: Fraction;
  /** Set when expectedKind === 'trend' (line-trend). */
  expectedTrend?: TrendAnswer;
  /** Set when expectedKind === 'time' (timetable-read), as canonical HH:MM. */
  expectedTime?: string;
  /** Plain noun for the y-axis / prompt unit, e.g. "votes", "apples". */
  unit: string;

  // Timetable-only fields.
  /** Station names (rows) for timetable skills, e.g. ['London', 'Reading', 'Bath']. */
  stations?: string[];
  /**
   * Departure/arrival times for timetable skills as HH:MM strings.
   * times[stationIdx][serviceIdx] — same station per row, services as columns.
   * Length: stations.length × services.
   */
  times?: string[][];
  /** Query parameters for timetable skills. */
  timetableQuery?: TimetableQuery;

  /** Query parameters for multi-step bar skill. */
  multiStepQuery?: MultiStepQuery;
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

/**
 * Line-chart pools — ordered (time-series friendly) and use plain ASCII
 * labels. We always pick a contiguous run from the start so the x-axis reads
 * in natural order.
 */
interface OrderedPool {
  readonly name: string;
  readonly unit: string;
  readonly labels: ReadonlyArray<string>;
}

const LINE_POOLS: ReadonlyArray<OrderedPool> = [
  {
    name: 'days',
    unit: 'visitors',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  {
    name: 'months',
    unit: 'sales',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  },
  {
    name: 'weeks',
    unit: 'books read',
    labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6', 'Wk7'],
  },
];

/** Station pools for timetable skills. Always pick the first N. */
const STATION_POOLS: ReadonlyArray<ReadonlyArray<string>> = [
  ['London', 'Reading', 'Bath', 'Bristol'],
  ['Oxford', 'Didcot', 'Swindon', 'Cardiff'],
  ['York', 'Leeds', 'Derby', 'Birmingham'],
  ['Edinburgh', 'Newcastle', 'Durham', 'York'],
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

// -----------------------------------------------------------------------------
// Line-chart helpers.

function pickLinePool(prevName: string | null): OrderedPool {
  if (LINE_POOLS.length <= 1 || !prevName) return pick(LINE_POOLS);
  const others = LINE_POOLS.filter(p => p.name !== prevName);
  return pick(others);
}

/**
 * Generate `count` line-chart points with a clear trend signal so line-trend
 * is unambiguous and line-max has a single winner.
 *
 *   - 'rising': strictly non-decreasing with a clear net rise.
 *   - 'falling': strictly non-increasing with a clear net fall.
 *   - 'flat': repeated value (+/- tiny jitter is avoided to keep it readable).
 */
function buildTrendValues(
  count: number,
  maxValue: number,
  trend: TrendAnswer,
): number[] {
  const out: number[] = [];
  if (trend === 'flat') {
    const v = randInt(Math.max(1, Math.floor(maxValue / 4)), Math.max(2, Math.floor(maxValue / 2)));
    for (let i = 0; i < count; i++) out.push(v);
    return out;
  }
  // For rising/falling: walk a monotone sequence with random positive steps.
  // Ensure the total span fits inside [1, maxValue].
  const step = Math.max(1, Math.floor(maxValue / (count * 1.5)));
  let cur =
    trend === 'rising'
      ? randInt(1, Math.max(1, Math.floor(maxValue / 4)))
      : randInt(Math.max(2, Math.floor((maxValue * 3) / 4)), Math.max(3, maxValue - 1));
  out.push(cur);
  for (let i = 1; i < count; i++) {
    const delta = randInt(1, Math.max(1, step));
    cur = trend === 'rising' ? cur + delta : cur - delta;
    // Clamp to [1, maxValue] without flattening neighbouring points.
    if (cur < 1) cur = 1;
    if (cur > maxValue) cur = maxValue;
    out.push(cur);
  }
  return out;
}

/** Sample a value sequence with no specific trend constraint. Used by read-line. */
function buildFreeValues(count: number, maxValue: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(randInt(1, maxValue));
  return out;
}

function buildLineCategories(pool: OrderedPool, count: number, values: number[]): ChartCategory[] {
  // Take the first `count` labels so the x-axis is in natural order.
  const labels = pool.labels.slice(0, count);
  return labels.map((label, i) => ({ label, value: values[i] }));
}

function buildReadLine(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
} {
  const t = randInt(0, categories.length - 1);
  return {
    targets: [t],
    prompt: `What was the number of ${unit} on ${categories[t].label}?`,
    answer: categories[t].value,
  };
}

function buildLineTrend(trend: TrendAnswer, unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
  expectedTrend: TrendAnswer;
} {
  return {
    targets: [],
    prompt: `Is the trend of ${unit} rising, falling or flat?`,
    answer: 0,
    expectedTrend: trend,
  };
}

function buildLineMax(categories: ChartCategory[], unit: string): {
  targets: number[];
  prompt: string;
  answer: number;
  expectedLabel: string;
} {
  let idx = 0;
  for (let i = 1; i < categories.length; i++) {
    if (categories[i].value > categories[idx].value) idx = i;
  }
  return {
    targets: [idx],
    prompt: `Which point had the most ${unit}?`,
    answer: categories[idx].value,
    expectedLabel: categories[idx].label,
  };
}

/**
 * Pick line values with a unique maximum (line-max needs an unambiguous
 * winner). Up to a few attempts; tweak the largest if ties remain.
 */
function buildLineMaxValues(count: number, maxValue: number): number[] {
  for (let attempt = 0; attempt < 25; attempt++) {
    const vs = buildFreeValues(count, maxValue);
    const max = Math.max(...vs);
    const tieCount = vs.filter(v => v === max).length;
    if (tieCount === 1) return vs;
  }
  // Fallback: pick a clear winner by bumping one value past the rest.
  const vs = buildFreeValues(count, Math.max(2, maxValue - 1));
  const idx = randInt(0, count - 1);
  vs[idx] = Math.min(maxValue, Math.max(...vs) + 1);
  return vs;
}

// -----------------------------------------------------------------------------
// Multi-step bar helper.

function buildMultiStep(
  categories: ChartCategory[],
  unit: string,
): {
  targets: number[];
  prompt: string;
  answer: number;
  multiStepQuery: MultiStepQuery;
} {
  const a = randInt(0, categories.length - 1);
  let b = randInt(0, categories.length - 1);
  while (b === a) b = randInt(0, categories.length - 1);
  const ops: MultiStepQuery['op'][] = ['add', 'sub', 'diff'];
  const op = pick(ops);
  const A = categories[a];
  const B = categories[b];
  let answer = 0;
  let prompt = '';
  // For 'sub' we make sure the answer is non-negative by always subtracting
  // the smaller value from the larger value but still naming both bars.
  if (op === 'add') {
    answer = A.value + B.value;
    prompt = `What is the total of ${unit} for ${A.label} and ${B.label}?`;
  } else if (op === 'sub') {
    const xIdx = A.value >= B.value ? a : b;
    const yIdx = A.value >= B.value ? b : a;
    const x = categories[xIdx];
    const y = categories[yIdx];
    answer = Math.abs(A.value - B.value);
    prompt = `How many ${unit} does ${x.label} have minus ${y.label}?`;
    return {
      targets: [xIdx, yIdx],
      prompt,
      answer,
      multiStepQuery: { op: 'sub', aIdx: xIdx, bIdx: yIdx },
    };
  } else {
    answer = Math.abs(A.value - B.value);
    prompt = `What is the difference in ${unit} between ${A.label} and ${B.label}?`;
  }
  return {
    targets: [a, b],
    prompt,
    answer,
    multiStepQuery: { op, aIdx: a, bIdx: b },
  };
}

// -----------------------------------------------------------------------------
// Timetable helpers.

/** Format a minutes-since-midnight integer as HH:MM. */
export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Parse a typed time as HH:MM or H:MM. Returns canonical "HH:MM" string on
 * success; null otherwise. Accepts whitespace around tokens.
 */
export function parseTimeAnswer(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

/**
 * Build a timetable: TIMETABLE_STATIONS rows by TIMETABLE_SERVICES columns.
 * Each service has a base departure time at the first station and successive
 * leg durations (in minutes) added per station. Durations stay in [5, 60].
 */
function buildTimetable(): { stations: string[]; times: string[][] } {
  const stationLabels = pick(STATION_POOLS).slice(0, TIMETABLE_STATIONS);
  const stations = [...stationLabels];

  // Per-service departure base + per-leg durations (independent of service).
  // First service starts somewhere between 06:00 and 09:00. Subsequent
  // services depart 30..90 minutes later, so the table reads as morning runs.
  const legDurations: number[] = [];
  for (let s = 1; s < TIMETABLE_STATIONS; s++) {
    legDurations.push(randInt(15, 60));
  }
  const baseStart = randInt(6 * 60, 9 * 60);
  const serviceStarts: number[] = [baseStart];
  for (let i = 1; i < TIMETABLE_SERVICES; i++) {
    serviceStarts.push(serviceStarts[i - 1] + randInt(30, 90));
  }

  const times: string[][] = [];
  for (let stIdx = 0; stIdx < TIMETABLE_STATIONS; stIdx++) {
    const row: string[] = [];
    for (let svIdx = 0; svIdx < TIMETABLE_SERVICES; svIdx++) {
      let t = serviceStarts[svIdx];
      for (let leg = 0; leg < stIdx; leg++) t += legDurations[leg];
      row.push(formatHHMM(t));
    }
    times.push(row);
  }
  return { stations, times };
}

function diffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(n => parseInt(n, 10));
  const [th, tm] = to.split(':').map(n => parseInt(n, 10));
  return (th * 60 + tm) - (fh * 60 + fm);
}

function buildTimetableRead(
  stations: string[],
  times: string[][],
): {
  targets: number[];
  prompt: string;
  answer: number;
  expectedTime: string;
  timetableQuery: TimetableQuery;
} {
  const fromIdx = randInt(0, stations.length - 2);
  const toIdx = randInt(fromIdx + 1, stations.length - 1);
  const serviceIdx = randInt(0, times[0].length - 1);
  const arrivalTime = times[toIdx][serviceIdx];
  const fromTime = times[fromIdx][serviceIdx];
  return {
    targets: [],
    prompt: `The train leaves ${stations[fromIdx]} at ${fromTime}. What time does it arrive at ${stations[toIdx]}?`,
    answer: 0,
    expectedTime: arrivalTime,
    timetableQuery: { fromIdx, toIdx, serviceIdx, question: 'arrival' },
  };
}

function buildTimetableDuration(
  stations: string[],
  times: string[][],
): {
  targets: number[];
  prompt: string;
  answer: number;
  timetableQuery: TimetableQuery;
} {
  const fromIdx = randInt(0, stations.length - 2);
  const toIdx = randInt(fromIdx + 1, stations.length - 1);
  const serviceIdx = randInt(0, times[0].length - 1);
  const fromTime = times[fromIdx][serviceIdx];
  const toTime = times[toIdx][serviceIdx];
  const minutes = diffMinutes(fromTime, toTime);
  return {
    targets: [],
    prompt: `How many minutes does the journey from ${stations[fromIdx]} to ${stations[toIdx]} take?`,
    answer: minutes,
    timetableQuery: { fromIdx, toIdx, serviceIdx, question: 'duration' },
  };
}

function buildQuestion(
  skill: ChartSkill,
  numCategories: number,
  maxValue: number,
  prevPoolName: string | null,
): { question: ChartQuestion; poolName: string } {
  // Line-chart skills use their own pool family.
  if (isLineSkill(skill)) {
    const pool = pickLinePool(prevPoolName);
    const count = pick(LINE_POINT_COUNTS);
    let values: number[];
    let trend: TrendAnswer | null = null;
    if (skill === 'line-trend') {
      const trends: TrendAnswer[] = ['rising', 'falling', 'flat'];
      trend = pick(trends);
      values = buildTrendValues(count, maxValue, trend);
    } else if (skill === 'line-max') {
      values = buildLineMaxValues(count, maxValue);
    } else {
      values = buildFreeValues(count, maxValue);
    }
    const categories = buildLineCategories(pool, count, values);
    const unit = pool.unit;
    if (skill === 'read-line') {
      const built = buildReadLine(categories, unit);
      return {
        question: {
          skill,
          chartType: 'line',
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
    if (skill === 'line-trend') {
      const built = buildLineTrend(trend as TrendAnswer, unit);
      return {
        question: {
          skill,
          chartType: 'line',
          categories,
          targets: built.targets,
          prompt: built.prompt,
          answer: built.answer,
          expectedKind: 'trend',
          expectedTrend: built.expectedTrend,
          unit,
        },
        poolName: pool.name,
      };
    }
    // line-max
    const built = buildLineMax(categories, unit);
    return {
      question: {
        skill,
        chartType: 'line',
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

  // Timetable skills — no label pool, fixed station table.
  if (isTimetableSkill(skill)) {
    const { stations, times } = buildTimetable();
    if (skill === 'timetable-read') {
      const built = buildTimetableRead(stations, times);
      return {
        question: {
          skill,
          chartType: 'timetable',
          categories: [],
          targets: built.targets,
          prompt: built.prompt,
          answer: built.answer,
          expectedKind: 'time',
          expectedTime: built.expectedTime,
          stations,
          times,
          timetableQuery: built.timetableQuery,
          unit: 'time',
        },
        poolName: 'timetable',
      };
    }
    const built = buildTimetableDuration(stations, times);
    return {
      question: {
        skill,
        chartType: 'timetable',
        categories: [],
        targets: built.targets,
        prompt: built.prompt,
        answer: built.answer,
        expectedKind: 'number',
        stations,
        times,
        timetableQuery: built.timetableQuery,
        unit: 'minutes',
      },
      poolName: 'timetable',
    };
  }

  const pool = pickPool(prevPoolName);

  if (skill === 'multi-step-bar') {
    const categories = randomCategories(pool, numCategories, maxValue);
    const unit = pool.unit;
    const built = buildMultiStep(categories, unit);
    return {
      question: {
        skill,
        chartType: 'bar',
        categories,
        targets: built.targets,
        prompt: built.prompt,
        answer: built.answer,
        expectedKind: 'number',
        multiStepQuery: built.multiStepQuery,
        unit,
      },
      poolName: pool.name,
    };
  }

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
  if (kind === 'trend') {
    if (typeof typed !== 'string') return false;
    return typed.trim().toLowerCase() === (q.expectedTrend ?? '');
  }
  if (kind === 'time') {
    if (typeof typed !== 'string') return false;
    const parsed = parseTimeAnswer(typed);
    if (parsed === null) return false;
    return parsed === (q.expectedTime ?? '');
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
 * Which chart elements to visually highlight. We deliberately do NOT highlight
 * the element a question asks about — every prompt already names the category,
 * so highlighting it would hand over the answer (bug #10: "no clues"). The one
 * exception is pie-fraction, whose prompt explicitly refers to "the highlighted
 * slice", so that slice must stay marked.
 */
export function chartHighlightIndices(q: ChartQuestion): number[] {
  return q.skill === 'pie-fraction' ? q.targets : [];
}

/**
 * Multiple-choice options for easy/medium (typed on hard). Only numeric-answer
 * skills (bar/pie/line reads, totals, durations, multi-step) get choices;
 * fraction/trend/time/label skills return [] so the caller falls back to a
 * typed input. Medium adds a 'None of these' button that is the correct pick
 * when `hideCorrect` hides the true answer.
 */
export function generateChartChoices(
  q: ChartQuestion,
  difficulty: 'easy' | 'medium' | 'hard',
  hideCorrect = false,
): string[] {
  if ((q.expectedKind ?? 'number') !== 'number') return [];
  const isWrong = (c: string) => !isAnswerCorrect(q, c);
  if (difficulty === 'easy') return integerChoices(q.answer, 'easy', isWrong);
  return numericChoicesWithNone(q.answer, isWrong, String, hideCorrect);
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
