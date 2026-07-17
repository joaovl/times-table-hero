import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { createAccount, createSession } from './repo';
import { hashToken } from './tokens';
import { authenticate } from './authenticate';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
let db: Db;
const now = new Date('2026-07-11T00:00:00Z');

beforeEach(async () => {
  db = createTestDb([MIGRATION, MIGRATION_0004]);
  await createAccount(db, {
    id: 'acc1', email: 'p@example.com', passwordHash: 'H', salt: 'S',
    tzOffsetMin: 0, createdAt: '2026-07-10T00:00:00Z',
  });
});

async function seedSession(token: string) {
  await createSession(db, {
    tokenHash: await hashToken(token), accountId: 'acc1',
    expiresAt: '2026-08-09T00:00:00Z', createdAt: '2026-07-10T00:00:00Z',
  });
}

describe('authenticate', () => {
  it('authenticates via Bearer token', async () => {
    await seedSession('tokenA');
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer tokenA' } });
    expect((await authenticate(req, db, now))?.id).toBe('acc1');
  });

  it('authenticates via session cookie', async () => {
    await seedSession('tokenB');
    const req = new Request('https://x/', { headers: { Cookie: 'tth_session=tokenB' } });
    expect((await authenticate(req, db, now))?.id).toBe('acc1');
  });

  it('returns null when no token is present', async () => {
    expect(await authenticate(new Request('https://x/'), db, now)).toBeNull();
  });

  it('returns null for an unknown token', async () => {
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer nope' } });
    expect(await authenticate(req, db, now)).toBeNull();
  });
});
