import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../auth/__testutils__/testdb';
import { createAccount } from '../auth/repo';
import { createKid } from '../kids/repo';
import { upsertRules, listRules } from './repo';
import type { Db } from '../auth/types';
import type { RewardRulesConfig } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await createAccount(db, { id: 'acc1', email: 'p@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
});

const cfg = (reward: string): RewardRulesConfig => ({
  level1: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: reward },
  level2: { successDaysRequired: 5, weeklyReward: '10' },
  level3: { enabled: false, target: '2weeks', reward: 'x' },
});

describe('rules repo', () => {
  it('stores an all-kids rule and a per-kid rule and lists both', async () => {
    // A per-kid rule references kids(id) (FK), so the kid must exist first.
    await createKid(db, { id: 'k1', accountId: 'acc1', name: 'Sam', color: 'blue', icon: 'star', createdAt: '2026-07-10T00:00:00Z' });
    await upsertRules(db, 'acc1', null, cfg('all'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', 'k1', cfg('k1'), '2026-07-10T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    const byScope = Object.fromEntries(rows.map(r => [r.kidId ?? 'ALL', r.config.level1.dailyReward]));
    expect(byScope).toEqual({ ALL: 'all', k1: 'k1' });
  });

  it('upsert replaces the same scope rather than duplicating', async () => {
    await upsertRules(db, 'acc1', null, cfg('first'), '2026-07-10T00:00:00Z');
    await upsertRules(db, 'acc1', null, cfg('second'), '2026-07-11T00:00:00Z');
    const rows = await listRules(db, 'acc1');
    expect(rows).toHaveLength(1);
    expect(rows[0].config.level1.dailyReward).toBe('second');
  });
});
