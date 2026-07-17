import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from './signup';
import { onRequestPost as login } from './login';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
  resolve(__dirname, '../../../migrations/0004_kid_pins.sql'),
];
let db: Db;
beforeEach(async () => {
  db = createTestDb(MIGRATIONS);
  await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'longenough' }) }), env: { DB: db } });
});

const badLogin = () =>
  login({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@example.com', password: 'wrongpass1' }) }), env: { DB: db } });

describe('login throttling', () => {
  it('returns 429 after too many failed attempts', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await badLogin()).status;
    expect(last).toBe(429);
  });
});
