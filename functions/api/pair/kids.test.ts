import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestGet as getKids } from './kids';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as pair } from './index';
import { createKid } from '../../_lib/kids/repo';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
  resolve(__dirname, '../../../migrations/0003_bugs.sql'),
  resolve(__dirname, '../../../migrations/0004_kid_pins.sql'),
  resolve(__dirname, '../../../migrations/0005_device_pairings.sql'),
  resolve(__dirname, '../../../migrations/0006_kid_sessions.sql'),
];
let db: Db;
beforeEach(() => { db = createTestDb(MIGRATIONS); });

async function doSignup(email: string, password: string, pin?: string) {
  const res = await signup({
    request: new Request('https://x/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, ...(pin ? { pin } : {}) }),
    }),
    env: { DB: db },
  });
  return (await res.json()) as { token: string; account: { id: string; email: string } };
}

async function doPair(body: unknown) {
  const res = await pair({
    request: new Request('https://x/api/pair', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
    env: { DB: db },
  });
  return (await res.json()) as { token: string };
}

function kidsRequest(pairingToken?: string) {
  const headers: Record<string, string> = {};
  if (pairingToken) headers.Authorization = `Bearer ${pairingToken}`;
  return getKids({
    request: new Request('https://x/api/pair/kids', { headers }),
    env: { DB: db },
  });
}

describe('GET /api/pair/kids', () => {
  it('returns the account kids for a paired device, without PIN data', async () => {
    const { account } = await doSignup('kids1@example.com', 'longenough', '135790');
    const { token: pairingToken } = await doPair({ email: 'kids1@example.com', pin: '135790' });

    await createKid(db, {
      id: 'k1',
      accountId: account.id,
      name: 'Sam',
      color: 'blue',
      icon: 'star',
      createdAt: '2026-07-10T00:00:00Z',
      pin: { hash: 'somehash', salt: 'somesalt' },
    });

    const res = await kidsRequest(pairingToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kids: { id: string; name: string }[] };
    expect(body.kids).toHaveLength(1);
    expect(body.kids[0]).toMatchObject({ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' });

    const raw = JSON.stringify(body);
    expect(raw).not.toContain('pin');
    expect(raw).not.toContain('somehash');
    expect(raw).not.toContain('somesalt');
  });

  it('requires a device-pairing token (401 without one)', async () => {
    const res = await kidsRequest();
    expect(res.status).toBe(401);
  });
});
