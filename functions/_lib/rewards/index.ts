import type {
  RewardRules, PracticeSession, EvaluateResult, DayOutcome, EarnedReward,
} from './types';
import { groupByLocalDay, localDayKey } from './days';
import { isDaySuccess } from './day-eval';
import { mondayOf, isoWeekKey, dayKeysFrom } from './weeks';

export function evaluate(
  rules: RewardRules,
  sessions: PracticeSession[],
  now: Date,
): EvaluateResult {
  const tz = rules.timezoneOffsetMinutes;
  const todayKey = localDayKey(now.toISOString(), tz);
  const byDay = groupByLocalDay(sessions, tz);

  // Day series from first activity to today.
  const playedKeys = [...byDay.keys()].sort();
  const startKey = playedKeys.length ? playedKeys[0] : todayKey;
  const allDayKeys = dayKeysFrom(startKey, todayKey);

  const daySuccess = new Map<string, boolean>();
  const days: DayOutcome[] = allDayKeys.map(date => {
    const played = byDay.get(date) ?? [];
    const success = isDaySuccess(played, rules.level1);
    daySuccess.set(date, success);
    let status: DayOutcome['status'];
    if (success) status = 'success';
    else if (date === todayKey) status = 'pending';
    else status = 'missed';
    return { date, status };
  });

  const earned: EarnedReward[] = [];

  // Level 1: a reward per successful day.
  for (const d of days) {
    if (d.status === 'success') {
      earned.push({ periodType: 'day', periodKey: d.date, rewardLabel: rules.level1.dailyReward });
    }
  }

  // Group day success by Monday-based week; a week is "complete" if its Monday
  // is strictly before this week's Monday.
  const thisMonday = mondayOf(todayKey);
  const weekSuccessDays = new Map<string, number>(); // mondayKey -> success count
  for (const date of allDayKeys) {
    const wk = mondayOf(date);
    const inc = daySuccess.get(date) ? 1 : 0;
    weekSuccessDays.set(wk, (weekSuccessDays.get(wk) ?? 0) + inc);
  }

  const completedWeeks = [...weekSuccessDays.keys()].filter(m => m < thisMonday).sort();
  const weekMet = (mondayKey: string): boolean =>
    (weekSuccessDays.get(mondayKey) ?? 0) >= rules.level2.successDaysRequired;

  // Level 2: earned weekly reward for each completed week meeting the threshold.
  for (const m of completedWeeks) {
    if (weekMet(m)) {
      earned.push({ periodType: 'week', periodKey: isoWeekKey(m), rewardLabel: rules.level2.weeklyReward });
    }
  }

  // Weekly streak = consecutive most-recent completed weeks that met the goal.
  let weeklyStreakWeeks = 0;
  for (let i = completedWeeks.length - 1; i >= 0; i--) {
    if (weekMet(completedWeeks[i])) weeklyStreakWeeks++;
    else break;
  }

  // Level 3: extended reward.
  const need = rules.level3.target === '2weeks' ? 2 : 4;
  const met = rules.level3.enabled && weeklyStreakWeeks >= need;
  if (met) {
    const anchor = completedWeeks[completedWeeks.length - weeklyStreakWeeks];
    earned.push({
      periodType: 'extended',
      periodKey: `${isoWeekKey(anchor)}+ext`,
      rewardLabel: rules.level3.reward,
    });
  }

  return {
    days,
    weeklyStreakWeeks,
    extended: { enabled: rules.level3.enabled, target: rules.level3.target, met },
    earned,
  };
}
