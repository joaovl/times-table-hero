import { describe, it, expect } from 'vitest';
import {
  recordFactAttempt,
  weightFor,
  weightedPick,
  stageOf,
  isDue,
  TARGET_MS,
  type FactStore,
} from './factModel';

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('recordFactAttempt', () => {
  it('creates a stat on first attempt without mutating input', () => {
    const store: FactStore = {};
    const next = recordFactAttempt(store, '7x8', true, 2000, NOW);
    expect(store).toEqual({}); // pure
    expect(next['7x8']).toMatchObject({ attempts: 1, correct: 1, avgMs: 2000 });
  });

  it('a correct fast answer boxes up; a wrong answer resets the box to 0', () => {
    let s: FactStore = {};
    s = recordFactAttempt(s, 'f', true, 1500, NOW);
    s = recordFactAttempt(s, 'f', true, 1500, NOW);
    expect(s['f'].box).toBeGreaterThanOrEqual(2);
    s = recordFactAttempt(s, 'f', false, 5000, NOW);
    expect(s['f'].box).toBe(0);
    expect(s['f'].correct).toBe(2);
    expect(s['f'].attempts).toBe(3);
  });

  it('a correct but slow answer does not box up', () => {
    let s: FactStore = {};
    s = recordFactAttempt(s, 'f', true, TARGET_MS + 2000, NOW);
    s = recordFactAttempt(s, 'f', true, TARGET_MS + 2000, NOW);
    expect(s['f'].box).toBe(0);
  });
});

describe('weightFor', () => {
  it('gives unseen facts a positive introduction weight', () => {
    expect(weightFor(undefined, NOW)).toBeGreaterThan(0);
  });

  it('weights an all-wrong fact above an all-right fact', () => {
    let s: FactStore = {};
    s = recordFactAttempt(s, 'wrong', false, 4000, NOW);
    s = recordFactAttempt(s, 'right', true, 1500, NOW);
    // make both due
    const later = NOW + 20 * DAY;
    expect(weightFor(s['wrong'], later)).toBeGreaterThan(weightFor(s['right'], later));
  });

  it('weights a slow fact above a fast one at equal accuracy', () => {
    let s: FactStore = {};
    s = recordFactAttempt(s, 'slow', true, TARGET_MS + 3000, NOW);
    s = recordFactAttempt(s, 'fast', true, 1000, NOW);
    const later = NOW + 20 * DAY;
    expect(weightFor(s['slow'], later)).toBeGreaterThan(weightFor(s['fast'], later));
  });

  it('a mastered, not-yet-due fact gets a small weight', () => {
    let s: FactStore = {};
    for (let i = 0; i < 5; i++) s = recordFactAttempt(s, 'm', true, 1200, NOW);
    // immediately after (not due), weight should be low
    expect(weightFor(s['m'], NOW + 1000)).toBeLessThan(0.3);
  });
});

describe('weightedPick', () => {
  it('is biased toward higher-weight keys', () => {
    const weights = [
      { key: 'heavy', weight: 10 },
      { key: 'light', weight: 1 },
    ];
    let heavy = 0;
    let seed = 42;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 2000; i++) {
      if (weightedPick(weights, 1, rand)[0] === 'heavy') heavy++;
    }
    expect(heavy).toBeGreaterThan(1400); // ~10:1 expected
  });

  it('returns the requested count even when it exceeds distinct keys', () => {
    const picks = weightedPick([{ key: 'a', weight: 1 }, { key: 'b', weight: 1 }], 5);
    expect(picks).toHaveLength(5);
  });

  it('handles an all-zero-weight pool without crashing', () => {
    const picks = weightedPick([{ key: 'a', weight: 0 }, { key: 'b', weight: 0 }], 3);
    expect(picks).toHaveLength(3);
  });
});

describe('stageOf / isDue', () => {
  it('labels a new fact and a drilled fact', () => {
    expect(stageOf(undefined)).toBe('new');
    let s: FactStore = {};
    for (let i = 0; i < 6; i++) s = recordFactAttempt(s, 'm', true, 1200, NOW);
    expect(['known', 'mastered']).toContain(stageOf(s['m']));
  });

  it('a fresh box-0 fact is immediately due', () => {
    const s = recordFactAttempt({}, 'f', false, 5000, NOW);
    expect(isDue(s['f'], NOW)).toBe(true);
  });
});
