import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as createKidRoute } from '../kids/index';
import { onRequestPut as putRules } from '../rules/index';
import { onRequestPost as logSessions } from '../sessions/index';
import { onRequestGet as dashboard } from './index';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
// /api/sessions now also checks for a kid session (Phase 3), which queries the
// kid_sessions table, so the dashboard test DB must include migration 0006.
const MIGRATION_0006 = resolve(__dirname, '../../../migrations/0006_kid_sessions.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION, MIGRATION_0004, MIGRATION_0006]);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function makeKid(): Promise<string> {
  const res = await createKidRoute({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }), env: { DB: db } });
  return (await res.json() as { kid: { id: string } }).kid.id;
}
const put = (body: unknown) => putRules({ request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify(body) }), env: { DB: db } });
const getDash = (kidId: string) => dashboard({ request: new Request(`https://x/api/dashboard?kidId=${kidId}`, { headers: auth() }), env: { DB: db } });

const balanceRule = {
  daily: { mode: 'balance', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } },
  ladder: [{ threshold: 3, reward: 'cinema' }],
  paused: false,
};

// Yesterday at 10:00 UTC, so its local (tz 0) day is strictly before today.
function yesterdayIso(offsetMin = 0): { start: string; end: string } {
  const d = new Date();
  const y = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 10, 0, 0));
  const end = new Date(y.getTime() + offsetMin * 60_000 + 1200_000);
  return { start: y.toISOString(), end: end.toISOString() };
}

describe('GET /api/dashboard', () => {
  it('computes a balance-mode reward from logged sessions', async () => {
    const kidId = await makeKid();
    expect((await put({ kidId, rules: balanceRule })).status).toBe(200);
    const { start, end } = yesterdayIso();
    await logSessions({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ kidId, sessions: [{ id: 's1', startedAt: start, endedAt: end, durationSec: 1200, module: 'times-tables', correct: 10, total: 10, topics: [] }] }) }),
      env: { DB: db },
    });
    const res = await getDash(kidId);
    expect(res.status).toBe(200);
    const body = await res.json() as { mode: string; unitLabel: string; balanceUnits: number };
    expect(body.mode).toBe('balance');
    expect(body.unitLabel).toBe('hours of TV');
    // yesterday: 20 min @ 100% -> qualified -> +1 ; today: pending 0
    expect(body.balanceUnits).toBe(1);
  });

  it('reports fixed mode for a fixed rule', async () => {
    const kidId = await makeKid();
    await put({ kidId, rules: { daily: { mode: 'fixed', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, dailyReward: '1 pound' }, ladder: [{ threshold: 5, reward: 'w' }], paused: false } });
    const body = await (await getDash(kidId)).json() as { mode: string };
    expect(body.mode).toBe('fixed');
  });

  it('404s for a kid that is not yours, 401 without auth', async () => {
    expect((await getDash('ghost')).status).toBe(404);
    const res = await dashboard({ request: new Request('https://x/api/dashboard?kidId=k'), env: { DB: db } });
    expect(res.status).toBe(401);
  });
});
