import type { Db } from '../auth/types';
import type { RewardRulesConfig } from './types';

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

export async function upsertRules(
  db: Db,
  accountId: string,
  kidId: string | null,
  config: RewardRulesConfig,
  updatedAt: string,
): Promise<void> {
  // The unique index is on (account_id, IFNULL(kid_id,'')). SQLite ON CONFLICT
  // needs concrete columns, so delete-then-insert keeps the "one row per scope"
  // invariant for both the NULL (all-kids) and per-kid cases.
  await db
    .prepare('DELETE FROM reward_rules WHERE account_id = ? AND IFNULL(kid_id, \'\') = IFNULL(?, \'\')')
    .bind(accountId, kidId)
    .run();
  await db
    .prepare('INSERT INTO reward_rules (id,account_id,kid_id,level1_json,level2_json,level3_json,updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(
      crypto.randomUUID(), accountId, kidId,
      JSON.stringify(config.level1), JSON.stringify(config.level2), JSON.stringify(config.level3),
      updatedAt,
    )
    .run();
}

export async function listRules(db: Db, accountId: string): Promise<RulesRow[]> {
  const { results } = await db
    .prepare('SELECT kid_id, level1_json, level2_json, level3_json, updated_at FROM reward_rules WHERE account_id = ?')
    .bind(accountId)
    .all<DbRulesRow>();
  return results.map(r => ({
    kidId: r.kid_id,
    config: {
      level1: JSON.parse(r.level1_json),
      level2: JSON.parse(r.level2_json),
      level3: JSON.parse(r.level3_json),
    },
    updatedAt: r.updated_at,
  }));
}
