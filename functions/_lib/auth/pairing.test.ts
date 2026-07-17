import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { createAccount } from './repo';
import { createDevicePairing, findDevicePairing, deleteDevicePairing, listDevicePairings } from './pairing';
import { requireAccount, requireDevicePairing } from './guard';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
const MIGRATION_0005 = resolve(__dirname, '../../../migrations/0005_device_pairings.sql');
let db: Db;

beforeEach(() => {
  db = createTestDb([MIGRATION, MIGRATION_0004, MIGRATION_0005]);
});

const acct = {
  id: 'acc1', email: 'p@example.com', passwordHash: 'H', salt: 'S',
  tzOffsetMin: 60, createdAt: '2026-07-10T00:00:00Z',
};

describe('device pairing repo', () => {
  beforeEach(async () => { await createAccount(db, acct); });

  it('stores and finds a live pairing, ignores expired, and scopes delete', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    await createDevicePairing(db, {
      tokenHash: 'h1', accountId: 'acc1', label: 'iPad',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
    });
    expect(await findDevicePairing(db, 'h1', now)).toEqual({ accountId: 'acc1' });

    // expired
    const later = new Date(now.getTime() + 2 * 86_400_000);
    expect(await findDevicePairing(db, 'h1', later)).toBeNull();

    // scoped delete: wrong account is a no-op
    await deleteDevicePairing(db, 'h1', 'other');
    expect(await findDevicePairing(db, 'h1', now)).toEqual({ accountId: 'acc1' });

    await deleteDevicePairing(db, 'h1', 'acc1');
    expect(await findDevicePairing(db, 'h1', now)).toBeNull();
  });

  it('lists pairings for an account with a token hash prefix', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    await createDevicePairing(db, {
      tokenHash: 'abcdefgh12345', accountId: 'acc1', label: 'iPad',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
    });
    const list = await listDevicePairings(db, 'acc1');
    expect(list).toEqual([
      { tokenHashPrefix: 'abcdefgh', label: 'iPad', createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString() },
    ]);
  });

  it('requireAccount rejects a device-pairing token (capability scoping)', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    const pairToken = generateSessionToken();
    await createDevicePairing(db, {
      tokenHash: await hashToken(pairToken), accountId: 'acc1', label: 'iPad',
      createdAt: now.toISOString(), expiresAt: sessionExpiry(now, 180),
    });

    const request = new Request('https://x/api/kids', {
      headers: { Authorization: `Bearer ${pairToken}` },
    });

    const accountResult = await requireAccount(request, db);
    expect(accountResult).toBeInstanceOf(Response);
    expect((accountResult as Response).status).toBe(401);

    const pairingResult = await requireDevicePairing(request, db);
    expect(pairingResult).toEqual({ accountId: 'acc1' });
  });
});
