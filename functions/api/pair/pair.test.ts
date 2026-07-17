import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost } from './index';
import { onRequestPost as signup } from '../auth/signup';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
  resolve(__dirname, '../../../migrations/0004_kid_pins.sql'),
  resolve(__dirname, '../../../migrations/0005_device_pairings.sql'),
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

function pairRequest(body: unknown, opts: { authToken?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;
  return onRequestPost({
    request: new Request('https://x/api/pair', {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    }),
    env: { DB: db },
  });
}

describe('POST /api/pair', () => {
  it('Mode A: an authenticated parent gets a pairing token', async () => {
    const { token: parentSession } = await doSignup('p@example.com', 'longenough', '135790');
    const res = await pairRequest({}, { authToken: parentSession });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBeTruthy();
  });

  it('Mode B: email + correct family PIN gets a pairing token; wrong PIN is 401', async () => {
    await doSignup('p2@example.com', 'longenough', '246810');
    const ok = await pairRequest({ email: 'p2@example.com', pin: '246810' });
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as { token: string };
    expect(okBody.token).toBeTruthy();

    const bad = await pairRequest({ email: 'p2@example.com', pin: '999999' });
    expect(bad.status).toBe(401);
  });

  it('Mode B: an account with no family PIN cannot be paired', async () => {
    await doSignup('p3@example.com', 'longenough');
    const res = await pairRequest({ email: 'p3@example.com', pin: '123456' });
    expect(res.status).toBe(401);
  });

  it('Mode B: unknown email returns generic 401 (no enumeration)', async () => {
    const res = await pairRequest({ email: 'ghost@example.com', pin: '123456' });
    expect(res.status).toBe(401);
  });

  it('with no session and no body, returns 401', async () => {
    const res = await pairRequest({});
    expect(res.status).toBe(401);
  });
});
