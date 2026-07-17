import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../auth/__testutils__/testdb';
import { createAccount } from '../auth/repo';
import { createKid, listKids, getKid, deleteKid } from './repo';
import type { Db } from '../auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
let db: Db;

beforeEach(async () => {
  db = createTestDb([MIGRATION, MIGRATION_0004]);
  await createAccount(db, { id: 'acc1', email: 'p@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
  await createAccount(db, { id: 'acc2', email: 'q@x.com', passwordHash: 'H', salt: 'S', tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z' });
});

const kid = (over: Partial<{ id: string; accountId: string; name: string; color: string; icon: string; createdAt: string }> = {}) => ({
  id: 'k1', accountId: 'acc1', name: 'Sam', color: 'blue', icon: 'star', createdAt: '2026-07-10T00:00:00Z', ...over,
});

describe('kids repo', () => {
  it('creates and lists kids for an account only', async () => {
    await createKid(db, kid({ id: 'k1', name: 'Sam' }));
    await createKid(db, kid({ id: 'k2', name: 'Alex', createdAt: '2026-07-10T01:00:00Z' }));
    await createKid(db, kid({ id: 'k3', accountId: 'acc2', name: 'Other' }));

    const mine = await listKids(db, 'acc1');
    expect(mine.map(k => k.name)).toEqual(['Sam', 'Alex']);
  });

  it('getKid is account-scoped', async () => {
    await createKid(db, kid({ id: 'k1', accountId: 'acc1' }));
    expect((await getKid(db, 'acc1', 'k1'))?.name).toBe('Sam');
    expect(await getKid(db, 'acc2', 'k1')).toBeNull(); // not your kid
  });

  it('deleteKid is account-scoped', async () => {
    await createKid(db, kid({ id: 'k1', accountId: 'acc1' }));
    await deleteKid(db, 'acc2', 'k1'); // wrong account: no-op
    expect(await getKid(db, 'acc1', 'k1')).not.toBeNull();
    await deleteKid(db, 'acc1', 'k1');
    expect(await getKid(db, 'acc1', 'k1')).toBeNull();
  });
});
