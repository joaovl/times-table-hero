import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as login } from './login';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  await signup({
    request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }),
    env: { DB: db },
  });
});

const doLogin = (body: unknown) =>
  login({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify(body) }), env: { DB: db } });

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await doLogin({ email: 'P@Example.com', password: 'longenough' });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('tth_session=');
    expect((await res.json() as { account: { email: string } }).account.email).toBe('p@example.com');
  });

  it('returns generic 401 for a wrong password', async () => {
    const res = await doLogin({ email: 'p@example.com', password: 'wrongpass1' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('returns the SAME generic 401 for an unknown email (no enumeration)', async () => {
    const res = await doLogin({ email: 'ghost@example.com', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });
});
