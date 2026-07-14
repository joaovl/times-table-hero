import type { Level1Rule, PracticeSession } from './types';
import { groupByLocalDay, localDayKey } from './days';
import { dayKeysFrom } from './weeks';
import { isDaySuccess } from './day-eval';

export interface Tier {
  threshold: number; // total successful days needed to unlock this tier
  reward: string;
}

/** The daily qualification gate + optional targeted-practice focus. */
export interface DailyGate {
  goal: Level1Rule['goal'];
  score: Level1Rule['score'];
  weakTopics?: Level1Rule['weakTopics'];
  focus?: string[]; // if set, a day only qualifies if it practised one of these topics
}

export interface LadderDay {
  date: string;
  status: 'success' | 'missed' | 'pending';
}

export interface LadderTier {
  threshold: number;
  reward: string;
  earned: boolean;
}

export interface LadderResult {
  totalSuccessfulDays: number;
  days: LadderDay[];
  tiers: LadderTier[];
}

/**
 * The reward ladder: count total successful days (cumulative — never lost), and
 * unlock each tier once the count reaches its threshold. Targeted-practice
 * focus adds a "must have practised one of these topics" gate to a good day.
 * While paused, an empty past day is shown as pending rather than a miss.
 */
export function computeLadder(params: {
  gate: DailyGate;
  sessions: PracticeSession[];
  now: Date;
  tzOffsetMinutes: number;
  ladder: Tier[];
  paused: boolean;
}): LadderResult {
  const { gate, sessions, now, tzOffsetMinutes, ladder, paused } = params;
  const todayKey = localDayKey(now.toISOString(), tzOffsetMinutes);
  const byDay = groupByLocalDay(sessions, tzOffsetMinutes);
  const played = [...byDay.keys()].sort();
  const startKey = played.length ? played[0] : todayKey;
  const allDays = dayKeysFrom(startKey, todayKey);
  const focus = gate.focus ?? [];

  let total = 0;
  const days: LadderDay[] = allDays.map(date => {
    const day = byDay.get(date) ?? [];
    const focusOk = focus.length === 0 || day.some(s => s.topics.some(t => focus.includes(t)));
    const qualified = focusOk && isDaySuccess(day, { ...gate, dailyReward: '' });
    if (qualified) {
      total += 1;
      return { date, status: 'success' };
    }
    if (date === todayKey || paused) return { date, status: 'pending' };
    return { date, status: 'missed' };
  });

  const tiers: LadderTier[] = [...ladder]
    .sort((a, b) => a.threshold - b.threshold)
    .map(t => ({ threshold: t.threshold, reward: t.reward, earned: total >= t.threshold }));

  return { totalSuccessfulDays: total, days, tiers };
}
