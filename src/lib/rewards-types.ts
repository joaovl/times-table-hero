export interface Level1Rule {
  goal: { minutes?: number; exercises?: number; sessions?: number };
  score: { kind: 'dailyPercent'; minPercent: number } | { kind: 'lastNAverage'; n: number; minPercent: number };
  weakTopics?: { topics: string[]; minPercent: number };
  dailyReward: string;
}
export interface Level2Rule { successDaysRequired: number; weeklyReward: string }
export interface Level3Rule { enabled: boolean; target: '2weeks' | 'month'; reward: string }
export interface RewardRulesConfig { level1: Level1Rule; level2: Level2Rule; level3: Level3Rule }

export const DEFAULT_RULES: RewardRulesConfig = {
  level1: { goal: { minutes: 15 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '' },
  level2: { successDaysRequired: 5, weeklyReward: '' },
  level3: { enabled: false, target: '2weeks', reward: '' },
};
