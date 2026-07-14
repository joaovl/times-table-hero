// Adaptive fact engine (pure, on-device, no network).
//
// Tracks how a child is doing on each individual "fact" (e.g. the 7x8
// multiplication fact) and turns that into a selection weight so practice
// leans on the facts they get wrong, are slow on, or are overdue to revisit —
// while mastered facts fade to occasional review. Everything here is a pure
// function on a plain FactStore object; persistence lives in factStore.ts.
//
// The model blends three signals:
//   struggle  — low accuracy and/or slow recall raise the weight
//   spacing   — a Leitner box sets when a fact is "due" again (correct
//               answers push it to a longer interval; a wrong answer resets it)
//   novelty   — never-seen facts get a moderate weight so they get introduced

export interface FactStat {
  attempts: number;
  correct: number;
  avgMs: number;   // exponential moving average of response time
  box: number;     // Leitner box 0..5 (higher = longer review interval)
  lastSeen: number; // epoch ms of the last attempt
}

export type FactStore = Record<string, FactStat>;

// A response at or under this time counts as "fluent" for promotion/box-up.
export const TARGET_MS = 3000;

// Leitner review intervals per box, in milliseconds. Box 0 is due immediately.
const DAY = 24 * 60 * 60 * 1000;
const BOX_INTERVAL_MS = [0, 1 * DAY, 2 * DAY, 4 * DAY, 8 * DAY, 16 * DAY];
const MAX_BOX = BOX_INTERVAL_MS.length - 1;

function intervalMs(box: number): number {
  return BOX_INTERVAL_MS[Math.max(0, Math.min(MAX_BOX, box))];
}

export function isDue(stat: FactStat, now: number): boolean {
  return now - stat.lastSeen >= intervalMs(stat.box);
}

// Record one answer, returning a NEW store (never mutates the input).
export function recordFactAttempt(
  store: FactStore,
  key: string,
  correct: boolean,
  ms: number,
  now: number = Date.now(),
): FactStore {
  const prev = store[key];
  const clampedMs = Math.max(1, Math.min(ms, 60_000));
  const fluent = correct && clampedMs <= TARGET_MS;

  let stat: FactStat;
  if (!prev) {
    stat = {
      attempts: 1,
      correct: correct ? 1 : 0,
      avgMs: clampedMs,
      box: correct ? (fluent ? 1 : 0) : 0,
      lastSeen: now,
    };
  } else {
    // EMA on response time so recent speed dominates without wild swings.
    const avgMs = Math.round(prev.avgMs * 0.6 + clampedMs * 0.4);
    let box = prev.box;
    if (correct) box = fluent ? Math.min(MAX_BOX, prev.box + 1) : prev.box;
    else box = 0; // a miss sends it back to daily review
    stat = {
      attempts: prev.attempts + 1,
      correct: prev.correct + (correct ? 1 : 0),
      avgMs,
      box,
      lastSeen: now,
    };
  }
  return { ...store, [key]: stat };
}

// Selection weight for one fact. Higher = practise sooner/more often.
export function weightFor(stat: FactStat | undefined, now: number = Date.now()): number {
  if (!stat || stat.attempts === 0) return 1.2; // introduce unseen facts

  const acc = stat.correct / stat.attempts;
  const accuracyNeed = 1 - acc;                                  // 0 (perfect)..1
  const slowNeed = Math.max(0, Math.min(1, (stat.avgMs - TARGET_MS) / TARGET_MS));
  const struggle = 0.2 + 1.8 * accuracyNeed + 0.8 * slowNeed;

  // A fact that isn't due yet still gets a small trickle so it's not gone.
  const due = isDue(stat, now);
  const base = due ? struggle : 0.12;

  // Barely-seen facts stay a bit elevated until they've been tested twice.
  return base + (stat.attempts < 2 ? 0.4 : 0);
}

// Weighted sample WITHOUT replacement where possible: pick `n` keys biased by
// weight, avoiding immediate repeats until the pool is exhausted. Falls back to
// refilling when n exceeds the number of distinct keys.
export function weightedPick(
  weights: { key: string; weight: number }[],
  n: number,
  rand: () => number = Math.random,
): string[] {
  const out: string[] = [];
  if (weights.length === 0 || n <= 0) return out;
  while (out.length < n) {
    let pool = weights.filter(w => w.weight > 0);
    if (pool.length === 0) pool = weights.map(w => ({ ...w, weight: 1 }));
    const total = pool.reduce((s, w) => s + w.weight, 0);
    let r = rand() * total;
    let chosen = pool[pool.length - 1].key;
    for (const w of pool) {
      r -= w.weight;
      if (r <= 0) { chosen = w.key; break; }
    }
    out.push(chosen);
  }
  return out;
}

export type FactStage = 'new' | 'learning' | 'known' | 'mastered';

// A coarse label for views (kid heatmap, parent dashboard) and for the
// recognition -> recall -> speed promotion ladder.
export function stageOf(stat: FactStat | undefined): FactStage {
  if (!stat || stat.attempts === 0) return 'new';
  const acc = stat.correct / stat.attempts;
  if (stat.box >= 4 && acc >= 0.9 && stat.avgMs <= TARGET_MS) return 'mastered';
  if (stat.box >= 2 && acc >= 0.8) return 'known';
  return 'learning';
}
