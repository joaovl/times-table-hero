import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { createAccount } from './repo';
import { createKid } from '../kids/repo';
import { createKidSession, findKidSession, deleteKidSession } from './kidsession';
import { requireAccount, requireDevicePairing, requireKid } from './guard';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';
import type { Db } from './types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
const MIGRATION_0005 = resolve(__dirname, '../../../migrations/0005_device_pairings.sql');
const MIGRATION_0006 = resolve(__dirname, '../../../migrations/0006_kid_sessions.sql');
let db: Db;

beforeEach(() => {
  db = createTestDb([MIGRATION, MIGRATION_0004, MIGRATION_0005, MIGRATION_0006]);
});

const acct = {
  id: 'acc1', email: 'k@example.com', passwordHash: 'H', salt: 'S',
  tzOffsetMin: 60, createdAt: '2026-07-10T00:00:00Z',
};

const kid = {
  id: 'kid1', accountId: 'acc1', name: 'Ada', color: 'blue', icon: 'star',
  createdAt: '2026-07-10T00:00:00Z',
};

describe('kid session repo', () => {
  beforeEach(async () => {
    await createAccount(db, acct);
    await createKid(db, kid);
  });

  it('stores and finds a live session, and expired sessions are null', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    await createKidSession(db, {
      tokenHash: 'h1', kidId: 'kid1', accountId: 'acc1',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
    });
    expect(await findKidSession(db, 'h1', now)).toEqual({ kidId: 'kid1', accountId: 'acc1' });

    // expired
    const later = new Date(now.getTime() + 2 * 86_400_000);
    expect(await findKidSession(db, 'h1', later)).toBeNull();
  });

  it('deletes a session', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    await createKidSession(db, {
      tokenHash: 'h2', kidId: 'kid1', accountId: 'acc1',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(),
    });
    expect(await findKidSession(db, 'h2', now)).toEqual({ kidId: 'kid1', accountId: 'acc1' });

    await deleteKidSession(db, 'h2');
    expect(await findKidSession(db, 'h2', now)).toBeNull();
  });

  it('returns null for a missing session', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    expect(await findKidSession(db, 'nope', now)).toBeNull();
  });

  it('requireKid accepts a kid-session token, requireAccount rejects it (capability scoping)', async () => {
    const now = new Date('2026-07-17T10:00:00Z');
    const kidToken = generateSessionToken();
    await createKidSession(db, {
      tokenHash: await hashToken(kidToken), kidId: 'kid1', accountId: 'acc1',
      createdAt: now.toISOString(), expiresAt: sessionExpiry(now, 180),
    });

    const request = new Request('https://x/api/kids/kid1/practice', {
      headers: { Authorization: `Bearer ${kidToken}` },
    });

    const accountResult = await requireAccount(request, db);
    expect(accountResult).toBeInstanceOf(Response);
    expect((accountResult as Response).status).toBe(401);

    // A kid token is neither a parent session nor a device pairing.
    const pairingResult = await requireDevicePairing(request, db);
    expect(pairingResult).toBeInstanceOf(Response);
    expect((pairingResult as Response).status).toBe(401);

    const kidResult = await requireKid(request, db);
    expect(kidResult).toEqual({ kidId: 'kid1', accountId: 'acc1' });
  });
});
