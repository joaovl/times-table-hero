import { describe, it, expect } from 'vitest';
import { computeLadder, type Tier, type DailyGate } from './ladder';
import type { PracticeSession } from './types';

const gate: DailyGate = { goal: { minutes: 10 }, score: { kind: 'dailyPercent', minPercent: 50 } };
const ladder: Tier[] = [
  { threshold: 2, reward: 'sticker' },
  { threshold: 4, reward: 'toy' },
];

const win = (date: string, topics: string[] = []): PracticeSession => ({
  kidId: 'k', startedAt: `${date}T10:00:00Z`, durationSec: 900, module: 'times-tables', correct: 10, total: 10, topics,
});

describe('computeLadder', () => {
  it('counts total successful days and unlocks tiers at their thresholds', () => {
    const now = new Date('2026-07-08T12:00:00Z');
    const sessions = [win('2026-07-06'), win('2026-07-07')]; // 2 good days
    const r = computeLadder({ gate, sessions, now, tzOffsetMinutes: 0, ladder, paused: false });
    expect(r.totalSuccessfulDays).toBe(2);
    expect(r.tiers.find(t => t.threshold === 2)?.earned).toBe(true);
    expect(r.tiers.find(t => t.threshold === 4)?.earned).toBe(false);
  });

  it('is cumulative — a missed day in the middle does not reset progress', () => {
    const now = new Date('2026-07-10T12:00:00Z');
    // good, MISS, good, good -> 3 total (not reset by the gap)
    const sessions = [win('2026-07-07'), win('2026-07-09'), win('2026-07-10')];
    const r = computeLadder({ gate, sessions, now, tzOffsetMinutes: 0, ladder, paused: false });
    expect(r.totalSuccessfulDays).toBe(3);
    expect(r.days.find(d => d.date === '2026-07-08')?.status).toBe('missed');
  });

  it('applies a targeted-practice focus (day must include a focus topic)', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const focusGate: DailyGate = { ...gate, focus: ['mult-8'] };
    const noFocus = computeLadder({ gate: focusGate, sessions: [win('2026-07-06', ['mult-3'])], now, tzOffsetMinutes: 0, ladder, paused: false });
    expect(noFocus.totalSuccessfulDays).toBe(0); // practised, but not the 8s
    const withFocus = computeLadder({ gate: focusGate, sessions: [win('2026-07-06', ['mult-8'])], now, tzOffsetMinutes: 0, ladder, paused: false });
    expect(withFocus.totalSuccessfulDays).toBe(1);
  });

  it('while paused, a missed past day is pending (not a penalised miss)', () => {
    const now = new Date('2026-07-08T12:00:00Z');
    const r = computeLadder({ gate, sessions: [win('2026-07-06')], now, tzOffsetMinutes: 0, ladder, paused: true });
    expect(r.days.find(d => d.date === '2026-07-07')?.status).toBe('pending');
  });

  it('today, if not yet done, is pending', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    const r = computeLadder({ gate, sessions: [], now, tzOffsetMinutes: 0, ladder, paused: false });
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('pending');
    expect(r.totalSuccessfulDays).toBe(0);
  });
});
