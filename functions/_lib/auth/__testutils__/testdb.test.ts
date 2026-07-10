import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from './testdb';

const MIGRATION = resolve(__dirname, '../../../../migrations/0001_init.sql');

describe('createTestDb', () => {
  it('applies the Phase 1 migration and can round-trip a row', async () => {
    const db = createTestDb([MIGRATION]);
    await db
      .prepare('INSERT INTO accounts (id,email,password_hash,salt,tz_offset_min,created_at) VALUES (?,?,?,?,?,?)')
      .bind('a1', 'p@example.com', 'h', 's', 0, '2026-07-10T00:00:00Z')
      .run();
    const row = await db
      .prepare('SELECT email FROM accounts WHERE id = ?')
      .bind('a1')
      .first<{ email: string }>();
    expect(row?.email).toBe('p@example.com');
  });
});
