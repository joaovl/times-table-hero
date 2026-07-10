import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost } from './signup';
import { authenticate } from '../../_lib/auth/authenticate';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(() => { db = createTestDb([MIGRATION]); });

const post = (body: unknown) =>
  onRequestPost({
    request: new Request('https://x/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env: { DB: db },
  });

describe('POST /api/auth/signup', () => {
  it('creates an account, sets a cookie, returns a usable token', async () => {
    const res = await post({ email: 'New@Example.com', password: 'longenough' });
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toContain('tth_session=');
    const bodyJson = await res.json() as { token: string; account: { email: string } };
    expect(bodyJson.account.email).toBe('new@example.com'); // normalized

    // the returned bearer token authenticates. Use the real clock here because
    // signup issued the session with new Date(); a hardcoded "now" could fall
    // outside the session's real-time validity window and flake.
    const authed = await authenticate(
      new Request('https://x/', { headers: { Authorization: `Bearer ${bodyJson.token}` } }),
      db, new Date(),
    );
    expect(authed?.email).toBe('new@example.com');
  });

  it('rejects a short password with 400', async () => {
    expect((await post({ email: 'a@b.co', password: 'short' })).status).toBe(400);
  });

  it('rejects a duplicate email with 409 (generic code)', async () => {
    await post({ email: 'dup@example.com', password: 'longenough' });
    const res = await post({ email: 'dup@example.com', password: 'longenough' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email_taken' });
  });
});
