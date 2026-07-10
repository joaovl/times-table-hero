import { describe, it, expect } from 'vitest';
import { evaluate } from './index';
import type { PracticeSession, RewardRules } from './types';

const rules: RewardRules = {
  level1: { goal: { sessions: 1 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '1 pound' },
  level2: { successDaysRequired: 5, weeklyReward: '10 pounds' },
  level3: { enabled: true, target: '2weeks', reward: 'shoes' },
  timezoneOffsetMinutes: 0,
};

// A perfect session on a given local day.
const win = (date: string): PracticeSession => ({
  kidId: 'k1', startedAt: `${date}T10:00:00Z`, durationSec: 600,
  module: 'times-tables', correct: 10, total: 10, topics: [],
});

describe('evaluate — days', () => {
  it('marks played-and-passed days success, gaps missed, and today pending when unplayed', () => {
    const now = new Date('2026-07-08T12:00:00Z'); // Wednesday
    const sessions = [win('2026-07-06'), win('2026-07-07')]; // Mon, Tue
    const r = evaluate(rules, sessions, now);
    const byDate = Object.fromEntries(r.days.map(d => [d.date, d.status]));
    expect(byDate['2026-07-06']).toBe('success');
    expect(byDate['2026-07-07']).toBe('success');
    expect(byDate['2026-07-08']).toBe('pending'); // today, not yet played
  });

  it('a low-score day is missed, not success', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const weak: PracticeSession = { ...win('2026-07-06'), correct: 5, total: 10 };
    const r = evaluate(rules, [weak], now);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('missed');
  });
});

describe('evaluate — weekly streak + earned', () => {
  it('earns the weekly reward when success days reach the threshold', () => {
    const now = new Date('2026-07-13T12:00:00Z'); // Monday of the next week
    // Mon–Fri of week 2026-W28 all won (5 days)
    const days = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const r = evaluate(rules, days.map(win), now);
    expect(r.weeklyStreakWeeks).toBe(1);
    expect(r.earned.some(e => e.periodType === 'week' && e.rewardLabel === '10 pounds')).toBe(true);
  });

  it('does not earn the weekly reward below the threshold', () => {
    const now = new Date('2026-07-13T12:00:00Z');
    const days = ['2026-07-06', '2026-07-07', '2026-07-08']; // only 3
    const r = evaluate(rules, days.map(win), now);
    expect(r.weeklyStreakWeeks).toBe(0);
    expect(r.earned.some(e => e.periodType === 'week')).toBe(false);
  });
});

describe('evaluate — extended', () => {
  it('unlocks the extended reward after 2 consecutive successful weeks', () => {
    const now = new Date('2026-07-20T12:00:00Z'); // Monday after two full weeks
    const wk1 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const wk2 = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    const r = evaluate(rules, [...wk1, ...wk2].map(win), now);
    expect(r.extended.met).toBe(true);
    expect(r.earned.some(e => e.periodType === 'extended' && e.rewardLabel === 'shoes')).toBe(true);
  });

  it('stays locked when disabled', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    const off: RewardRules = { ...rules, level3: { ...rules.level3, enabled: false } };
    const wk1 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10'];
    const wk2 = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'];
    const r = evaluate(off, [...wk1, ...wk2].map(win), now);
    expect(r.extended.met).toBe(false);
    expect(r.earned.some(e => e.periodType === 'extended')).toBe(false);
  });
});

describe('evaluate — recompute after a mid-week rule change', () => {
  it('re-evaluates history under the new (stricter) rules', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const day = win('2026-07-06'); // 100%
    const strict: RewardRules = {
      ...rules,
      level1: { ...rules.level1, goal: { minutes: 20 } }, // needs 20 min; the session is 10 min
    };
    const r = evaluate(strict, [day], now);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('missed');
  });
});
