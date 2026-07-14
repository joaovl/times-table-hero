// Statistics module — Y6 (with Y6/Y7 transition for median/mode/range).
//
// Skills:
//   - mean-calc            : compute the arithmetic mean of n numbers
//   - mean-find-missing    : given mean and all-but-one values, find missing
//   - median               : median of an odd-or-even-length set
//   - mode                 : the most frequent value (unique mode generated)
//   - range                : max - min of a set
//
// All numbers are positive integers so the canonical answer is also a
// positive integer (or an integer ratio in the case of mean which we
// construct so it stays integer).

import { integerChoices } from '@/lib/game/choices';
export type StatsSkill =
  | 'mean-calc'
  | 'mean-find-missing'
  | 'median'
  | 'mode'
  | 'range';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MeanCalcQuestion {
  skill: 'mean-calc';
  values: number[];
  answer: number; // sum / values.length, constructed integer
}

export interface MeanFindMissingQuestion {
  skill: 'mean-find-missing';
  values: number[];        // n-1 known values
  missingIndex: number;    // 0..n-1 where the unknown sits
  givenMean: number;       // the stated mean
  answer: number;          // the missing value
}

export interface MedianQuestion {
  skill: 'median';
  values: number[];
  answer: number;
}

export interface ModeQuestion {
  skill: 'mode';
  values: number[];
  answer: number; // the unique mode
}

export interface RangeQuestion {
  skill: 'range';
  values: number[];
  answer: number; // max - min
}

export type StatsQuestion =
  | MeanCalcQuestion
  | MeanFindMissingQuestion
  | MedianQuestion
  | ModeQuestion
  | RangeQuestion;

export interface StatsSettings {
  skills: StatsSkill[];
  difficulty: Difficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: StatsSkill[] = [
  'mean-calc',
  'mean-find-missing',
  'median',
  'mode',
  'range',
];

export const SKILL_LABELS: Record<StatsSkill, string> = {
  'mean-calc': 'Mean',
  'mean-find-missing': 'Find missing (mean)',
  median: 'Median',
  mode: 'Mode',
  range: 'Range',
};

export const CURRICULUM_TAGS: Record<
  StatsSkill,
  { year: 6 | 7; objective: string }[]
> = {
  'mean-calc': [
    { year: 6, objective: 'Calculate and interpret the mean as an average' },
  ],
  'mean-find-missing': [
    { year: 6, objective: 'Use the mean to find a missing value in a data set' },
  ],
  // median / mode / range are at the Y6 / Y7 transition boundary; we tag
  // both years so curriculum maps can resolve them either way.
  median: [
    { year: 6, objective: 'Find the median of a small data set (Y6/Y7 transition)' },
  ],
  mode: [
    { year: 6, objective: 'Find the mode of a small data set (Y6/Y7 transition)' },
  ],
  range: [
    { year: 6, objective: 'Find the range of a small data set (Y6/Y7 transition)' },
  ],
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleSize(difficulty: Difficulty): number {
  // Use small odd-or-even-length sets that fit cleanly on a single line.
  if (difficulty === 'easy') return pickFrom([3, 4]);
  if (difficulty === 'medium') return pickFrom([4, 5]);
  return pickFrom([5, 6, 7]);
}

function valueRange(difficulty: Difficulty): { min: number; max: number } {
  if (difficulty === 'easy') return { min: 1, max: 10 };
  if (difficulty === 'medium') return { min: 1, max: 20 };
  return { min: 1, max: 50 };
}

// ---------- mean-calc ----------
function buildMeanCalc(difficulty: Difficulty): MeanCalcQuestion {
  const n = sampleSize(difficulty);
  // To guarantee integer mean, pick a target mean then build values that
  // sum to mean * n.
  const { min, max } = valueRange(difficulty);
  for (let attempt = 0; attempt < 80; attempt++) {
    const mean = randInt(min + 1, max - 1);
    const values: number[] = [];
    let remaining = mean * n;
    let ok = true;
    for (let i = 0; i < n - 1; i++) {
      // Each value still must be in [min, max] AND leave enough for the
      // rest to also stay in range.
      const remainingSlots = n - 1 - i;
      const minHere = Math.max(min, remaining - remainingSlots * max);
      const maxHere = Math.min(max, remaining - remainingSlots * min);
      if (minHere > maxHere) {
        ok = false;
        break;
      }
      const v = randInt(minHere, maxHere);
      values.push(v);
      remaining -= v;
    }
    if (!ok) continue;
    if (remaining < min || remaining > max) continue;
    values.push(remaining);
    // Shuffle for variety.
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return { skill: 'mean-calc', values, answer: mean };
  }
  // Fallback.
  return { skill: 'mean-calc', values: [3, 7, 5, 9], answer: 6 };
}

// ---------- mean-find-missing ----------
function buildMeanFindMissing(difficulty: Difficulty): MeanFindMissingQuestion {
  // Build a mean-calc question, then hide one value.
  const base = buildMeanCalc(difficulty);
  const idx = randInt(0, base.values.length - 1);
  return {
    skill: 'mean-find-missing',
    values: [...base.values],
    missingIndex: idx,
    givenMean: base.answer,
    answer: base.values[idx],
  };
}

// ---------- median ----------
function buildMedian(difficulty: Difficulty): MedianQuestion {
  const { min, max } = valueRange(difficulty);
  let n = sampleSize(difficulty);
  // Force odd length so the median is always an integer in the set.
  if (n % 2 === 0) n -= 1;
  if (n < 3) n = 3;
  const values: number[] = [];
  // Use distinct-ish values for cleanliness.
  const usedSet = new Set<number>();
  while (values.length < n) {
    const v = randInt(min, max);
    if (!usedSet.has(v)) {
      values.push(v);
      usedSet.add(v);
    }
  }
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  return { skill: 'median', values, answer: median };
}

// ---------- mode ----------
function buildMode(difficulty: Difficulty): ModeQuestion {
  const { min, max } = valueRange(difficulty);
  const n = sampleSize(difficulty);
  // Pick a target mode and ensure it appears strictly more than any other.
  for (let attempt = 0; attempt < 60; attempt++) {
    const target = randInt(min, max);
    // Build values where `target` appears 3 times (or n/2+1 for safety) and
    // other values appear at most twice.
    const targetCount = Math.max(3, Math.floor(n / 2) + 1);
    if (targetCount > n) continue;
    const values: number[] = Array(targetCount).fill(target);
    while (values.length < n) {
      const v = randInt(min, max);
      const count = values.filter(x => x === v).length;
      if (v === target) continue; // don't add more of target
      if (count >= 2) continue; // limit non-target frequency to 2
      values.push(v);
    }
    if (values.length !== n) continue;
    // Verify unique mode.
    const freq = new Map<number, number>();
    values.forEach(v => freq.set(v, (freq.get(v) ?? 0) + 1));
    const maxFreq = Math.max(...freq.values());
    const modes = Array.from(freq.entries()).filter(([, c]) => c === maxFreq).map(([v]) => v);
    if (modes.length !== 1 || modes[0] !== target) continue;
    // Shuffle.
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return { skill: 'mode', values, answer: target };
  }
  return { skill: 'mode', values: [2, 5, 2, 7, 5, 5, 9], answer: 5 };
}

// ---------- range ----------
function buildRange(difficulty: Difficulty): RangeQuestion {
  const { min, max } = valueRange(difficulty);
  const n = sampleSize(difficulty);
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    values.push(randInt(min, max));
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // Avoid degenerate range = 0 by re-rolling once if all equal.
  if (lo === hi) {
    values[0] = lo === max ? lo - 1 : lo + 1;
  }
  const lo2 = Math.min(...values);
  const hi2 = Math.max(...values);
  return { skill: 'range', values, answer: hi2 - lo2 };
}

function sampleOne(skill: StatsSkill, difficulty: Difficulty): StatsQuestion {
  switch (skill) {
    case 'mean-calc':
      return buildMeanCalc(difficulty);
    case 'mean-find-missing':
      return buildMeanFindMissing(difficulty);
    case 'median':
      return buildMedian(difficulty);
    case 'mode':
      return buildMode(difficulty);
    case 'range':
      return buildRange(difficulty);
  }
}

export function generateStatsQuestions(
  settings: StatsSettings,
  count: number
): StatsQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['mean-calc'] as StatsSkill[]);
  const out: StatsQuestion[] = [];
  for (let i = 0; i < count; i++) {
    out.push(sampleOne(pickFrom(skills), settings.difficulty));
  }
  return out;
}

// ---------- Prompt and answer text ----------

function listText(values: number[]): string {
  return values.join(', ');
}

export function questionPromptText(q: StatsQuestion): string {
  if (q.skill === 'mean-calc') {
    return `Mean of ${listText(q.values)}?`;
  }
  if (q.skill === 'mean-find-missing') {
    const masked = q.values
      .map((v, i) => (i === q.missingIndex ? '?' : String(v)))
      .join(', ');
    return `Mean of ${masked} is ${q.givenMean}. Find ?`;
  }
  if (q.skill === 'median') {
    return `Median of ${listText(q.values)}?`;
  }
  if (q.skill === 'mode') {
    return `Mode of ${listText(q.values)}?`;
  }
  // range
  return `Range of ${listText(q.values)}?`;
}

export function answerText(q: StatsQuestion): string {
  return String((q as { answer: number }).answer);
}

export function checkStatsAnswer(q: StatsQuestion, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (!/^-?\d+$/.test(trimmed)) return false;
  const n = parseInt(trimmed, 10);
  return n === (q as { answer: number }).answer;
}

// Discriminators.
export function isMeanCalcQuestion(q: StatsQuestion): q is MeanCalcQuestion {
  return q.skill === 'mean-calc';
}
export function isMeanFindMissingQuestion(q: StatsQuestion): q is MeanFindMissingQuestion {
  return q.skill === 'mean-find-missing';
}
export function isMedianQuestion(q: StatsQuestion): q is MedianQuestion {
  return q.skill === 'median';
}
export function isModeQuestion(q: StatsQuestion): q is ModeQuestion {
  return q.skill === 'mode';
}
export function isRangeQuestion(q: StatsQuestion): q is RangeQuestion {
  return q.skill === 'range';
}

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: StatsQuestion, difficulty: Difficulty): string[] {
  const s = answerText(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !checkStatsAnswer(q, c));
}
