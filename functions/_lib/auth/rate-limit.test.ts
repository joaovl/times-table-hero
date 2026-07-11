import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './__testutils__/testdb';
import { recordAndCheck } from './rate-limit';
import type { Db } from './types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
];
let db: Db;
beforeEach(() => { db = createTestDb(MIGRATIONS); });

const opts = { maxAttempts: 3, windowMs: 900_000 };

describe('recordAndCheck', () => {
  it('blocks only after exceeding the max within a window', async () => {
    const now = new Date('2026-07-10T10:00:00Z');
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 1
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 2
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(false); // 3
    expect((await recordAndCheck(db, 'p@x.com', now, opts)).blocked).toBe(true);  // 4 > 3
  });

  it('resets in a new window', async () => {
    const w1 = new Date('2026-07-10T10:00:00Z');
    for (let i = 0; i < 4; i++) await recordAndCheck(db, 'p@x.com', w1, opts);
    const w2 = new Date('2026-07-10T10:20:00Z'); // next 15-min window
    expect((await recordAndCheck(db, 'p@x.com', w2, opts)).blocked).toBe(false);
  });

  it('tracks emails independently', async () => {
    const now = new Date('2026-07-10T10:00:00Z');
    for (let i = 0; i < 4; i++) await recordAndCheck(db, 'a@x.com', now, opts);
    expect((await recordAndCheck(db, 'b@x.com', now, opts)).blocked).toBe(false);
  });
});
