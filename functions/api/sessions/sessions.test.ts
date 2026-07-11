import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as createKidRoute } from '../kids/index';
import { onRequestPost as logSessions } from './index';
import { listSessions } from '../../_lib/sessions/repo';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION]);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function makeKid(): Promise<string> {
  const res = await createKidRoute({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }), env: { DB: db } });
  return (await res.json() as { kid: { id: string } }).kid.id;
}

const session = (id: string) => ({
  id, startedAt: '2026-07-10T10:00:00Z', endedAt: '2026-07-10T10:20:00Z',
  durationSec: 1200, module: 'times-tables', correct: 9, total: 10, topics: ['mult-7'],
});

const post = (body: unknown) =>
  logSessions({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify(body) }), env: { DB: db } });

describe('POST /api/sessions', () => {
  it('logs sessions and is idempotent by id', async () => {
    const kidId = await makeKid();
    expect((await post({ kidId, sessions: [session('s1'), session('s2')] })).status).toBe(201);
    expect((await listSessions(db, kidId)).length).toBe(2);
    // re-post the same ids -> no duplicates
    await post({ kidId, sessions: [session('s1'), session('s2')] });
    expect((await listSessions(db, kidId)).length).toBe(2);
  });

  it('rejects sessions for a kid that is not yours (404)', async () => {
    expect((await post({ kidId: 'ghost', sessions: [session('s1')] })).status).toBe(404);
  });

  it('rejects malformed input (400)', async () => {
    const kidId = await makeKid();
    expect((await post({ kidId, sessions: [{ id: 'bad' }] })).status).toBe(400);
  });

  it('requires authentication (401)', async () => {
    const res = await logSessions({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ kidId: 'k', sessions: [] }) }), env: { DB: db } });
    expect(res.status).toBe(401);
  });
});
