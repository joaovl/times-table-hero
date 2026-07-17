import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signin } from './signin';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as pair } from '../pair/index';
import { createKid } from '../../_lib/kids/repo';
import { hashPassword } from '../../_lib/auth/password';
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

function signinRequest(body: unknown, opts: { pairingToken?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.pairingToken) headers.Authorization = `Bearer ${opts.pairingToken}`;
  return signin({
    request: new Request('https://x/api/kid/signin', {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    }),
    env: { DB: db },
  });
}

describe('POST /api/kid/signin', () => {
  it('correct kid PIN returns 200 + kid session token', async () => {
    const { account } = await doSignup('ks1@example.com', 'longenough', '135790');
    const { token: pairingToken } = await doPair({ email: 'ks1@example.com', pin: '135790' });
    const { hash, salt } = await hashPassword('417293');
    await createKid(db, {
      id: 'kid1', accountId: account.id, name: 'Sam', color: 'blue', icon: 'star',
      createdAt: '2026-07-10T00:00:00Z', pin: { hash, salt },
    });

    const res = await signinRequest({ kidId: 'kid1', pin: '417293' }, { pairingToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBeTruthy();
  });

  it('wrong PIN returns 401', async () => {
    const { account } = await doSignup('ks2@example.com', 'longenough', '135790');
    const { token: pairingToken } = await doPair({ email: 'ks2@example.com', pin: '135790' });
    const { hash, salt } = await hashPassword('417293');
    await createKid(db, {
      id: 'kid2', accountId: account.id, name: 'Ana', color: 'red', icon: 'sun',
      createdAt: '2026-07-10T00:00:00Z', pin: { hash, salt },
    });

    const res = await signinRequest({ kidId: 'kid2', pin: '000000' }, { pairingToken });
    expect(res.status).toBe(401);
  });

  it('kid with NULL PIN returns 401', async () => {
    const { account } = await doSignup('ks3@example.com', 'longenough', '135790');
    const { token: pairingToken } = await doPair({ email: 'ks3@example.com', pin: '135790' });
    await createKid(db, {
      id: 'kid3', accountId: account.id, name: 'No Pin', color: 'green', icon: 'moon',
      createdAt: '2026-07-10T00:00:00Z',
    });

    const res = await signinRequest({ kidId: 'kid3', pin: '123456' }, { pairingToken });
    expect(res.status).toBe(401);
  });

  it('kid belonging to a different account returns 401', async () => {
    const { account: accountA } = await doSignup('ks4a@example.com', 'longenough', '135790');
    await doSignup('ks4b@example.com', 'longenough', '246810');
    const { token: pairingTokenB } = await doPair({ email: 'ks4b@example.com', pin: '246810' });
    const { hash, salt } = await hashPassword('417293');
    await createKid(db, {
      id: 'kid4', accountId: accountA.id, name: 'Sam', color: 'blue', icon: 'star',
      createdAt: '2026-07-10T00:00:00Z', pin: { hash, salt },
    });

    const res = await signinRequest({ kidId: 'kid4', pin: '417293' }, { pairingToken: pairingTokenB });
    expect(res.status).toBe(401);
  });

  it('no pairing token returns 401', async () => {
    const res = await signinRequest({ kidId: 'kid1', pin: '417293' });
    expect(res.status).toBe(401);
  });
});
