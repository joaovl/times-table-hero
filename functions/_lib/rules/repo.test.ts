import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../auth/__testutils__/testdb';
import { createAccount } from '../auth/repo';
import { createKid } from '../kids/repo';
import { upsertRules, listRules } from './repo';
import type { Db } from '../auth/types';
import type { RewardRulesConfig } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
let db: Db;
beforeEach(async () => {
  db = createTestDb([MIGRATION, MIGRATION_0004]);
  await createAccount(db, { id: 'acc1', email: 'p@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
});

const cfg = (reward: string): RewardRulesConfig => ({
  daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: reward },
  ladder: [{ threshold: 5, reward: '10' }],
  paused: false,
});

describe('rules repo (v2)', () => {
  it('stores an all-kids rule and a per-kid rule and lists both', async () => {
    await createKid(db, { id: 'k1', accountId: 'acc1', name: 'Sam', color: 'blue', icon: 'star', createdAt: '2026-07-10T00:00:00Z' });
    await upsertRules(db, 'acc1', null, cfg('all'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', 'k1', cfg('k1'), '2026-07-10T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    const byScope = Object.fromEntries(rows.map(r => [r.kidId ?? 'ALL', r.config.daily.dailyReward]));
    expect(byScope).toEqual({ ALL: 'all', k1: 'k1' });
    expect(rows[0].config.ladder).toEqual([{ threshold: 5, reward: '10' }]);
    expect(rows[0].config.paused).toBe(false);
  });

  it('upsert replaces the same scope rather than duplicating', async () => {
    await upsertRules(db, 'acc1', null, cfg('first'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', null, cfg('second'), '2026-07-11T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    expect(rows).toHaveLength(1);
    expect(rows[0].config.daily.dailyReward).toBe('second');
  });

  it('migrates a legacy (level1/level2/level3) row into a v2 config', async () => {
    // Directly insert an old-shape row (weekly + extended objects).
    await db.prepare('INSERT INTO reward_rules (id,account_id,kid_id,level1_json,level2_json,level3_json,updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind('legacy1', 'acc1', null,
        JSON.stringify({ goal: { minutes: 15 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: '1 pound' }),
        JSON.stringify({ successDaysRequired: 5, weeklyReward: '10 pounds' }),
        JSON.stringify({ enabled: true, target: '2weeks', reward: 'shoes' }),
        '2026-07-10T00:00:00Z')
      .run();
    const rows = await listRules(db, 'acc1');
    expect(rows).toHaveLength(1);
    expect(rows[0].config.daily.dailyReward).toBe('1 pound');
    expect(rows[0].config.ladder).toEqual([
      { threshold: 5, reward: '10 pounds' },
      { threshold: 14, reward: 'shoes' },
    ]);
    expect(rows[0].config.paused).toBe(false);
  });
});
