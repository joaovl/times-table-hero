export interface Level1Gate {
  goal: { minutes?: number; exercises?: number; sessions?: number };
  score: { kind: 'dailyPercent'; minPercent: number } | { kind: 'lastNAverage'; n: number; minPercent: number };
  weakTopics?: { topics: string[]; minPercent: number };
}

export interface BalanceRule {
  unitLabel: string;
  minutesPerUnit: number;
  exercisesPerUnit: number;
  rewardPerUnit: number;
  penaltyPerMissedDay: number;
}

// Level 1 is either a single fixed reward (met/not) or an accruing balance
// (e.g. hours of TV) that scales with practice. Missing `mode` means fixed.
export type Level1Rule =
  | (Level1Gate & { mode?: 'fixed'; dailyReward: string })
  | (Level1Gate & { mode: 'balance'; balance: BalanceRule });

export interface Level2Rule { successDaysRequired: number; weeklyReward: string }
export interface Level3Rule { enabled: boolean; target: '2weeks' | 'month'; reward: string }
export interface RewardRulesConfig { level1: Level1Rule; level2: Level2Rule; level3: Level3Rule }

export const DEFAULT_BALANCE: BalanceRule = {
  unitLabel: 'hours of TV',
  minutesPerUnit: 20,
  exercisesPerUnit: 10,
  rewardPerUnit: 1,
  penaltyPerMissedDay: 1,
};

export const DEFAULT_RULES: RewardRulesConfig = {
  level1: { mode: 'fixed', goal: { minutes: 15 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '' },
  level2: { successDaysRequired: 5, weeklyReward: '' },
  level3: { enabled: false, target: '2weeks', reward: '' },
};
