import type { Level1Rule, PracticeSession } from './types';
import { groupByLocalDay, localDayKey } from './days';
import { dayKeysFrom } from './weeks';
import { isDaySuccess } from './day-eval';

export interface BalanceRule {
  unitLabel: string;
  minutesPerUnit: number;
  exercisesPerUnit: number;
  rewardPerUnit: number;
  penaltyPerMissedDay: number;
}

/** The qualification part of a Level 1 rule (everything except the reward). */
export type BalanceGate = Omit<Level1Rule, 'dailyReward'>;

export interface BalanceDay {
  date: string;
  units: number;
  status: 'earned' | 'missed' | 'pending';
}
export interface BalanceResult {
  balanceUnits: number;
  days: BalanceDay[];
}

/**
 * Proportional "earned balance" reward. A qualified day earns the greater of the
 * time-based and count-based amounts (no cap); a non-qualified past day subtracts
 * the penalty; today, if not yet qualified, is pending (0). Qualification reuses
 * the fixed-mode gate via isDaySuccess, so the score/goal/weak rules are shared.
 */
export function computeBalance(
  gate: BalanceGate,
  balance: BalanceRule,
  sessions: PracticeSession[],
  now: Date,
  tzOffsetMinutes: number,
  paused = false,
): BalanceResult {
  const todayKey = localDayKey(now.toISOString(), tzOffsetMinutes);
  const byDay = groupByLocalDay(sessions, tzOffsetMinutes);
  const played = [...byDay.keys()].sort();
  const startKey = played.length ? played[0] : todayKey;
  const allDays = dayKeysFrom(startKey, todayKey);

  const days: BalanceDay[] = allDays.map(date => {
    const day = byDay.get(date) ?? [];
    const qualified = isDaySuccess(day, { ...gate, dailyReward: '' });
    if (qualified) {
      const minutes = day.reduce((s, x) => s + x.durationSec, 0) / 60;
      const exercises = day.reduce((s, x) => s + x.total, 0);
      const byTime = balance.minutesPerUnit > 0 ? Math.floor(minutes / balance.minutesPerUnit) : 0;
      const byCount = balance.exercisesPerUnit > 0 ? Math.floor(exercises / balance.exercisesPerUnit) : 0;
      return { date, units: Math.max(byTime, byCount) * balance.rewardPerUnit, status: 'earned' };
    }
    // While paused (holiday), a missed day neither subtracts nor counts against
    // the child — treat it as pending, not a penalised miss.
    if (date < todayKey && !paused) return { date, units: -balance.penaltyPerMissedDay, status: 'missed' };
    return { date, units: 0, status: 'pending' };
  });

  return { balanceUnits: days.reduce((s, d) => s + d.units, 0), days };
}
