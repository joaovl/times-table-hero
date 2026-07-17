import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import {
  createAccount, findAccountByEmail, getAccountById,
  createSession, findAccountBySessionHash, deleteSession,
} from './repo';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
let db: Db;

beforeEach(() => {
  db = createTestDb([MIGRATION, MIGRATION_0004]);
});

const acct = {
  id: 'acc1', email: 'p@example.com', passwordHash: 'H', salt: 'S',
  tzOffsetMin: 60, createdAt: '2026-07-10T00:00:00Z',
};

describe('account repo', () => {
  it('creates and finds an account by email and id', async () => {
    await createAccount(db, acct);
    const byEmail = await findAccountByEmail(db, 'p@example.com');
    expect(byEmail?.id).toBe('acc1');
    expect(byEmail?.tzOffsetMin).toBe(60);
    expect((await getAccountById(db, 'acc1'))?.email).toBe('p@example.com');
    expect(await findAccountByEmail(db, 'missing@example.com')).toBeNull();
  });
});

describe('session repo', () => {
  beforeEach(async () => { await createAccount(db, acct); });

  it('resolves a live session to its account', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
    });
    const found = await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z');
    expect(found?.id).toBe('acc1');
  });

  it('does not resolve an expired session', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-07-10T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
    });
    expect(await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z')).toBeNull();
  });

  it('deletes a session', async () => {
    await createSession(db, {
      tokenHash: 'TH', accountId: 'acc1',
      expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
    });
    await deleteSession(db, 'TH');
    expect(await findAccountBySessionHash(db, 'TH', '2026-07-11T00:00:00Z')).toBeNull();
  });
});
