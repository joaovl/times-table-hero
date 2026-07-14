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

// The daily earn rule: a qualification gate (goal + score), an optional
// targeted-practice `focus` (must have practised one of these topics), and
// either a single fixed reward or an accruing balance.
export interface DailyRule extends Level1Gate {
  focus?: string[];
  mode: 'fixed' | 'balance';
  dailyReward?: string;
  balance?: BalanceRule;
}

// One rung of the reward ladder: reach `threshold` total successful days to
// unlock `reward`.
export interface Tier {
  threshold: number;
  reward: string;
}

export interface RewardRulesConfig {
  daily: DailyRule;
  ladder: Tier[];
  paused: boolean;
}

export const DEFAULT_BALANCE: BalanceRule = {
  unitLabel: 'hours of TV',
  minutesPerUnit: 20,
  exercisesPerUnit: 10,
  rewardPerUnit: 1,
  penaltyPerMissedDay: 1,
};

export const DEFAULT_RULES: RewardRulesConfig = {
  daily: { goal: { minutes: 15 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: '' },
  ladder: [{ threshold: 5, reward: '' }],
  paused: false,
};

export const DEFAULT_TIER: Tier = { threshold: 7, reward: '' };
