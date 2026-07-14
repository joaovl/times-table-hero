import type { Level1Rule } from '../rewards/types';
import type { BalanceRule } from '../rewards/balance';
import type { Tier } from '../rewards/ladder';

export interface DailyRule {
  goal: Level1Rule['goal'];
  score: Level1Rule['score'];
  weakTopics?: Level1Rule['weakTopics'];
  focus?: string[];
  mode: 'fixed' | 'balance';
  dailyReward?: string;
  balance?: BalanceRule;
}

// v2 reward config: a daily earn rule + a ladder of milestone tiers (which
// replaced the fixed Daily/Weekly/Extended levels) + a holiday pause flag.
export interface RewardRulesConfig {
  daily: DailyRule;
  ladder: Tier[];
  paused: boolean;
}
