import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as logout } from './logout';
import { onRequestGet as me } from './me';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  const res = await signup({
    request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }),
    env: { DB: db },
  });
  token = (await res.json() as { token: string }).token;
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('me + logout', () => {
  it('me returns the account when authenticated', async () => {
    const res = await me({ request: new Request('https://x/', { headers: bearer(token) }), env: { DB: db } });
    expect(res.status).toBe(200);
    expect((await res.json() as { account: { email: string } }).account.email).toBe('p@example.com');
  });

  it('me returns 401 without a token', async () => {
    const res = await me({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('logout invalidates the session', async () => {
    await logout({ request: new Request('https://x/', { method: 'POST', headers: bearer(token) }), env: { DB: db } });
    const after = await me({ request: new Request('https://x/', { headers: bearer(token) }), env: { DB: db } });
    expect(after.status).toBe(401);
  });
});
