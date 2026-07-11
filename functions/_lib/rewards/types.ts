export interface Level1Rule {
  // At least one goal field must be set; only set fields are required to pass.
  goal: { minutes?: number; exercises?: number; sessions?: number };
  score:
    | { kind: 'dailyPercent'; minPercent: number }
    | { kind: 'lastNAverage'; n: number; minPercent: number };
  weakTopics?: { topics: string[]; minPercent: number };
  dailyReward: string;
}

export interface Level2Rule {
  successDaysRequired: number; // out of 7 (Mon–Sun)
  weeklyReward: string;
}

export interface Level3Rule {
  enabled: boolean;
  target: '2weeks' | 'month'; // 'month' = 4 consecutive successful weeks
  reward: string;
}

export interface RewardRules {
  level1: Level1Rule;
  level2: Level2Rule;
  level3: Level3Rule;
  timezoneOffsetMinutes: number;
}

export interface PracticeSession {
  kidId: string;
  startedAt: string;   // ISO 8601
  durationSec: number;
  module: string;
  correct: number;
  total: number;
  topics: string[];
}

export type DayStatus = 'success' | 'missed' | 'pending';

export interface DayOutcome {
  date: string;        // 'YYYY-MM-DD' local
  status: DayStatus;
}

export interface EarnedReward {
  periodType: 'day' | 'week' | 'extended';
  periodKey: string;
  rewardLabel: string;
}

export interface EvaluateResult {
  days: DayOutcome[];
  weeklyStreakWeeks: number;
  extended: { enabled: boolean; target: '2weeks' | 'month'; met: boolean };
  earned: EarnedReward[];
}
