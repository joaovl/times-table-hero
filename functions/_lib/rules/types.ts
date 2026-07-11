import type { Level1Rule, Level2Rule, Level3Rule } from '../rewards/types';
import type { BalanceRule } from '../rewards/balance';

/** Level 1 in a stored rule: either a fixed reward or an earned balance. A
 *  missing `mode` means fixed (backward compatible with earlier rows). */
export type Level1Config =
  | (Level1Rule & { mode?: 'fixed' })
  | (Omit<Level1Rule, 'dailyReward'> & { mode: 'balance'; balance: BalanceRule });

export interface RewardRulesConfig {
  level1: Level1Config;
  level2: Level2Rule;
  level3: Level3Rule;
}
