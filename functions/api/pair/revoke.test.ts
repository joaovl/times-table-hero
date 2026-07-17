import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestGet as list } from './list';
import { onRequestPost as revoke } from './revoke';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as pair } from './index';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
  resolve(__dirname, '../../../migrations/0004_kid_pins.sql'),
  resolve(__dirname, '../../../migrations/0005_device_pairings.sql'),
];
let db: Db;
beforeEach(() => { db = createTestDb(MIGRATIONS); });

async function doSignup(email: string, password: string) {
  const res = await signup({
    request: new Request('https://x/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
    env: { DB: db },
  });
  return (await res.json()) as { token: string; account: { id: string; email: string } };
}

async function doPair(authToken: string) {
  const res = await pair({
    request: new Request('https://x/api/pair', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({}),
    }),
    env: { DB: db },
  });
  return (await res.json()) as { token: string };
}

function listRequest(authToken: string) {
  return list({
    request: new Request('https://x/api/pair/list', {
      headers: { Authorization: `Bearer ${authToken}` },
    }),
    env: { DB: db },
  });
}

function revokeRequest(authToken: string, body: unknown) {
  return revoke({
    request: new Request('https://x/api/pair/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body ?? {}),
    }),
    env: { DB: db },
  });
}

describe('GET /api/pair/list', () => {
  it('returns the account devices without the raw token', async () => {
    const { token: session } = await doSignup('list1@example.com', 'longenough');
    await doPair(session);

    const res = await listRequest(session);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { devices: { tokenHashPrefix: string }[] };
    expect(body.devices).toHaveLength(1);
    expect(body.devices[0].tokenHashPrefix).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('"token"');
  });

  it('requires a parent session (401 without one)', async () => {
    const res = await listRequest('bogus');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/pair/revoke', () => {
  it('deletes only the caller devices matching identifier, account-scoped', async () => {
    const { token: sessionA } = await doSignup('rev-a@example.com', 'longenough');
    const { token: sessionB } = await doSignup('rev-b@example.com', 'longenough');
    await doPair(sessionA);
    await doPair(sessionB);

    const listA = (await (await listRequest(sessionA)).json()) as { devices: { tokenHashPrefix: string }[] };
    const listB = (await (await listRequest(sessionB)).json()) as { devices: { tokenHashPrefix: string }[] };
    expect(listA.devices).toHaveLength(1);
    expect(listB.devices).toHaveLength(1);

    // Account A cannot revoke account B's device.
    const crossRevoke = await revokeRequest(sessionA, { tokenHashPrefix: listB.devices[0].tokenHashPrefix });
    expect(crossRevoke.status).toBe(200);
    const listBAfterCross = (await (await listRequest(sessionB)).json()) as { devices: unknown[] };
    expect(listBAfterCross.devices).toHaveLength(1);

    // Account A revokes its own device.
    const ownRevoke = await revokeRequest(sessionA, { tokenHashPrefix: listA.devices[0].tokenHashPrefix });
    expect(ownRevoke.status).toBe(200);
    const listAAfter = (await (await listRequest(sessionA)).json()) as { devices: unknown[] };
    expect(listAAfter.devices).toHaveLength(0);

    // Account B's device is untouched.
    const listBAfter = (await (await listRequest(sessionB)).json()) as { devices: unknown[] };
    expect(listBAfter.devices).toHaveLength(1);
  });

  it('requires a parent session (401 without one)', async () => {
    const res = await revokeRequest('bogus', { tokenHashPrefix: 'abcdefgh' });
    expect(res.status).toBe(401);
  });

  it('400s on invalid body', async () => {
    const { token: session } = await doSignup('rev-c@example.com', 'longenough');
    const res = await revokeRequest(session, {});
    expect(res.status).toBe(400);
  });

  it('400s on a malformed tokenHashPrefix (wrong length or LIKE metacharacters) and deletes nothing', async () => {
    const { token: session } = await doSignup('rev-d@example.com', 'longenough');
    await doPair(session);
    const before = (await (await listRequest(session)).json()) as { devices: unknown[] };
    expect(before.devices).toHaveLength(1);

    // Truncated prefix (too short) would otherwise LIKE-match more broadly.
    const shortRes = await revokeRequest(session, { tokenHashPrefix: 'ab' });
    expect(shortRes.status).toBe(400);

    // LIKE metacharacter '%' would otherwise match every device on the account.
    const wildcardRes = await revokeRequest(session, { tokenHashPrefix: '%%%%%%%%' });
    expect(wildcardRes.status).toBe(400);

    const after = (await (await listRequest(session)).json()) as { devices: unknown[] };
    expect(after.devices).toHaveLength(1);
  });
});
