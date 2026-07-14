import type { Db } from '../auth/types';
import type { RewardRulesConfig, DailyRule } from './types';
import type { Tier } from '../rewards/ladder';

export interface RulesRow {
  kidId: string | null;
  config: RewardRulesConfig;
  updatedAt: string;
}

interface DbRulesRow {
  kid_id: string | null;
  level1_json: string;
  level2_json: string;
  level3_json: string;
  updated_at: string;
}

// Older rows stored { level1, level2(weekly), level3(extended) }. Map them to a
// v2 config (a daily rule + a ladder of tiers) so nothing breaks on read.
function migrateLegacy(l1: Record<string, unknown>, l2: Record<string, unknown>, l3: Record<string, unknown>): RewardRulesConfig {
  const daily = {
    goal: l1.goal, score: l1.score, weakTopics: l1.weakTopics,
    mode: l1.mode === 'balance' ? 'balance' : 'fixed',
    dailyReward: typeof l1.dailyReward === 'string' ? l1.dailyReward : '',
    balance: l1.balance,
  } as unknown as DailyRule;
  const ladder: Tier[] = [];
  if (l2 && typeof l2.weeklyReward === 'string' && l2.weeklyReward) {
    ladder.push({ threshold: typeof l2.successDaysRequired === 'number' ? l2.successDaysRequired : 5, reward: l2.weeklyReward });
  }
  if (l3 && l3.enabled === true && typeof l3.reward === 'string' && l3.reward) {
    ladder.push({ threshold: l3.target === '2weeks' ? 14 : 30, reward: l3.reward });
  }
  return { daily, ladder, paused: false };
}

export async function upsertRules(
  db: Db,
  accountId: string,
  kidId: string | null,
  config: RewardRulesConfig,
  updatedAt: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM reward_rules WHERE account_id = ? AND IFNULL(kid_id, \'\') = IFNULL(?, \'\')')
    .bind(accountId, kidId)
    .run();
  // The three legacy TEXT NOT NULL columns are reused to hold the v2 config:
  // level1_json = daily, level2_json = ladder (an array), level3_json = { paused }.
  await db
    .prepare('INSERT INTO reward_rules (id,account_id,kid_id,level1_json,level2_json,level3_json,updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(
      crypto.randomUUID(), accountId, kidId,
      JSON.stringify(config.daily), JSON.stringify(config.ladder), JSON.stringify({ paused: config.paused }),
      updatedAt,
    )
    .run();
}

export async function listRules(db: Db, accountId: string): Promise<RulesRow[]> {
  const { results } = await db
    .prepare('SELECT kid_id, level1_json, level2_json, level3_json, updated_at FROM reward_rules WHERE account_id = ?')
    .bind(accountId)
    .all<DbRulesRow>();
  return results.map(r => {
    const c1 = JSON.parse(r.level1_json) as Record<string, unknown>;
    const c2 = JSON.parse(r.level2_json) as unknown;
    const c3 = JSON.parse(r.level3_json) as Record<string, unknown>;
    // v2 rows store the ladder (an array) in level2_json; legacy rows store the
    // weekly-rule object there instead.
    const config: RewardRulesConfig = Array.isArray(c2)
      ? { daily: c1 as unknown as DailyRule, ladder: c2 as Tier[], paused: typeof c3.paused === 'boolean' ? c3.paused : false }
      : migrateLegacy(c1, c2 as Record<string, unknown>, c3);
    return { kidId: r.kid_id, config, updatedAt: r.updated_at };
  });
}
