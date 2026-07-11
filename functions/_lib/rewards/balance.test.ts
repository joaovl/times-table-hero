import { describe, it, expect } from 'vitest';
import { computeBalance, type BalanceRule } from './balance';
import type { PracticeSession, Level1Rule } from './types';

const gate: Omit<Level1Rule, 'dailyReward'> = {
  goal: { minutes: 20 },
  score: { kind: 'dailyPercent', minPercent: 50 },
};
const rule: BalanceRule = { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 };

const sess = (date: string, durationSec: number, correct: number, total: number): PracticeSession => ({
  kidId: 'k', startedAt: `${date}T10:00:00Z`, durationSec, module: 'times-tables', correct, total, topics: [],
});

describe('computeBalance', () => {
  it('earns the greater of the time and count bases', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    // 60 min -> floor(60/20)=3 ; 10 exercises -> floor(10/10)=1 ; max=3
    const r = computeBalance(gate, rule, [sess('2026-07-06', 3600, 10, 10)], now, 0);
    expect(r.balanceUnits).toBe(3);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('earned');
  });

  it('does not cap earnings', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const r = computeBalance(gate, rule, [sess('2026-07-06', 3600 * 3, 10, 10)], now, 0); // 180 min -> 9
    expect(r.balanceUnits).toBe(9);
  });

  it('subtracts a penalty for a missed (no-practice) past day', () => {
    const now = new Date('2026-07-08T12:00:00Z'); // today = 07-08
    // 07-06 earns +1 (20 min), 07-07 no practice -> -1 ; balance 0
    const r = computeBalance(gate, rule, [sess('2026-07-06', 1200, 10, 10)], now, 0);
    expect(r.days.find(d => d.date === '2026-07-07')?.status).toBe('missed');
    expect(r.balanceUnits).toBe(0);
  });

  it('takes away when the score gate fails despite enough time', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    // 40 min but 2/10 = 20% < 50% -> not qualified ; 07-06 < today -> missed -> -1
    const r = computeBalance(gate, rule, [sess('2026-07-06', 2400, 2, 10)], now, 0);
    expect(r.balanceUnits).toBe(-1);
  });

  it('gives today 0 (pending) when not yet qualified, no penalty', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    const r = computeBalance(gate, rule, [], now, 0);
    expect(r.days.find(d => d.date === '2026-07-06')?.status).toBe('pending');
    expect(r.balanceUnits).toBe(0);
  });

  it('honours a disabled basis (0 per-unit)', () => {
    const now = new Date('2026-07-07T12:00:00Z');
    const timeOnly: BalanceRule = { ...rule, exercisesPerUnit: 0 };
    // 25 min -> floor(25/20)=1 ; count basis disabled
    const r = computeBalance(gate, timeOnly, [sess('2026-07-06', 1500, 100, 100)], now, 0);
    expect(r.balanceUnits).toBe(1);
  });
});
