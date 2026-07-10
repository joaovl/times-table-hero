import { describe, it, expect } from 'vitest';
import { isDaySuccess } from './day-eval';
import type { Level1Rule, PracticeSession } from './types';

const session = (over: Partial<PracticeSession>): PracticeSession => ({
  kidId: 'k1', startedAt: '2026-07-10T10:00:00Z', durationSec: 600,
  module: 'times-tables', correct: 10, total: 10, topics: [], ...over,
});

const baseRule: Level1Rule = {
  goal: { minutes: 20 },
  score: { kind: 'dailyPercent', minPercent: 80 },
  dailyReward: '1 pound',
};

describe('isDaySuccess — goals', () => {
  it('fails when the time goal is not met', () => {
    // 10 min of practice vs 20 min required
    expect(isDaySuccess([session({ durationSec: 600 })], baseRule)).toBe(false);
  });

  it('passes when the time goal and score are met', () => {
    expect(isDaySuccess(
      [session({ durationSec: 1200 })], // 20 min, 100%
      baseRule,
    )).toBe(true);
  });

  it('requires every SET goal (time AND amount)', () => {
    const rule: Level1Rule = { ...baseRule, goal: { minutes: 20, exercises: 30 } };
    // 20 min but only 10 exercises → fails the amount goal
    expect(isDaySuccess([session({ durationSec: 1200, correct: 10, total: 10 })], rule)).toBe(false);
  });
});

describe('isDaySuccess — score', () => {
  it('dailyPercent aggregates across the day', () => {
    const rule: Level1Rule = { goal: { sessions: 2 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: 'x' };
    // 8/10 + 8/10 = 16/20 = 80% → pass
    expect(isDaySuccess([session({ correct: 8, total: 10 }), session({ correct: 8, total: 10 })], rule)).toBe(true);
    // 7/10 + 8/10 = 15/20 = 75% → fail
    expect(isDaySuccess([session({ correct: 7, total: 10 }), session({ correct: 8, total: 10 })], rule)).toBe(false);
  });

  it('lastNAverage averages the last N sessions of the day', () => {
    const rule: Level1Rule = { goal: { sessions: 1 }, score: { kind: 'lastNAverage', n: 2, minPercent: 100 }, dailyReward: 'x' };
    const s = [
      session({ startedAt: '2026-07-10T08:00:00Z', correct: 0, total: 10 }), // ignored (older)
      session({ startedAt: '2026-07-10T09:00:00Z', correct: 10, total: 10 }),
      session({ startedAt: '2026-07-10T10:00:00Z', correct: 10, total: 10 }),
    ];
    expect(isDaySuccess(s, rule)).toBe(true); // last 2 average 100%
  });
});

describe('isDaySuccess — weak topics', () => {
  const rule: Level1Rule = {
    goal: { sessions: 1 },
    score: { kind: 'dailyPercent', minPercent: 50 },
    weakTopics: { topics: ['mult-7'], minPercent: 90 },
    dailyReward: 'x',
  };

  it('enforces the stricter score only on sessions touching a weak topic', () => {
    // weak-topic session is 5/10 = 50% < 90% → fails despite overall passing
    expect(isDaySuccess([session({ correct: 5, total: 10, topics: ['mult-7'] })], rule)).toBe(false);
  });

  it('ignores the weak-topic rule when that topic was not practised', () => {
    expect(isDaySuccess([session({ correct: 6, total: 10, topics: ['mult-3'] })], rule)).toBe(true);
  });
});

describe('isDaySuccess — empty', () => {
  it('an empty day is never a success', () => {
    expect(isDaySuccess([], baseRule)).toBe(false);
  });
});
