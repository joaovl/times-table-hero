import type { Level1Rule, Level2Rule, Level3Rule } from '../rewards/types';

export interface RewardRulesConfig {
  level1: Level1Rule;
  level2: Level2Rule;
  level3: Level3Rule;
}
