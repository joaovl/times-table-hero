// Charts module — bar-chart practice.
//
// v1 scope: kid reads a bar chart and types a numeric answer for one of three
// skills (read-bar, compare-bar, total-bar). Pie, line, and word-problem
// variants from the roadmap are deferred to v2.

export type ChartSkill = 'read-bar' | 'compare-bar' | 'total-bar';

export const CHART_SKILL_OPTIONS: ReadonlyArray<ChartSkill> = [
  'read-bar',
  'compare-bar',
  'total-bar',
];

export const CHART_SKILL_LABEL: Record<ChartSkill, string> = {
  'read-bar': 'read-bar',
  'compare-bar': 'compare-bar',
  'total-bar': 'total-bar',
};

export const CHART_MAX_VALUE_OPTIONS = [10, 50, 100, 1000] as const;
export const CHART_NUM_CATEGORIES_OPTIONS = [4, 5, 6, 7] as const;

export interface ChartCategory {
  label: string;
  value: number;
}

export interface ChartQuestion {
  skill: ChartSkill;
  /** 4..7 categories with kid-friendly labels and integer values. */
  categories: ChartCategory[];
  /**
   * Indices into `categories` the question references.
   *   read-bar: exactly 1 target.
   *   compare-bar: exactly 2 distinct targets.
   *   total-bar: every index (0..n-1).
   */
  targets: number[];
  /** Human-readable prompt the kid sees, e.g. "How many votes did Tuesday get?". */
  prompt: string;
  /** Expected numeric answer. */
  answer: number;
  /** Plain noun for the y-axis / prompt unit, e.g. "votes", "apples". */
  unit: string;
}

export interface ChartSettings {
  /** Non-empty subset of ChartSkill. Default ['read-bar']. */
  skills: ChartSkill[];
  /** Bar values are drawn uniformly from 1..maxValue. */
  maxValue: number;
  /** Number of categories on every chart (4..7). */
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

function buildQuestion(
  skill: ChartSkill,
  numCategories: number,
  maxValue: number,
  prevPoolName: string | null,
): { question: ChartQuestion; poolName: string } {
  const pool = pickPool(prevPoolName);
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
 * answer must be a non-negative integer (all v1 skills produce >= 0). Strips
 * leading/trailing whitespace.
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

export function isAnswerCorrect(q: ChartQuestion, typed: string): boolean {
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
