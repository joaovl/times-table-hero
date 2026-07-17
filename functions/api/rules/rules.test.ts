import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as createKidRoute } from '../kids/index';
import { onRequestGet as getRules, onRequestPut as putRules } from './index';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0001_init.sql');
const MIGRATION_0004 = resolve(__dirname, '../../../migrations/0004_kid_pins.sql');
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb([MIGRATION, MIGRATION_0004]);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});
const auth = () => ({ Authorization: `Bearer ${token}` });

const config = {
  daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: '1 pound' },
  ladder: [{ threshold: 5, reward: '10 pounds' }, { threshold: 14, reward: 'shoes' }],
  paused: false,
};

const put = (body: unknown) => putRules({ request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify(body) }), env: { DB: db } });

describe('/api/rules', () => {
  it('requires authentication', async () => {
    const res = await getRules({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('stores all-kids rules and reads them back', async () => {
    expect((await put({ kidId: null, rules: config })).status).toBe(200);
    const res = await getRules({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { rules } = await res.json() as { rules: { kidId: string | null; config: typeof config }[] };
    expect(rules).toHaveLength(1);
    expect(rules[0].kidId).toBeNull();
    expect(rules[0].config.ladder[1].reward).toBe('shoes');
  });

  it('rejects a malformed config with 400', async () => {
    expect((await put({ kidId: null, rules: { daily: {} } })).status).toBe(400);
  });

  it('rejects rules for a kid that is not yours with 404', async () => {
    expect((await put({ kidId: 'ghost', rules: config })).status).toBe(404);
  });

  it('stores per-kid rules for your own kid', async () => {
    const created = await createKidRoute({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }), env: { DB: db } });
    const { kid } = await created.json() as { kid: { id: string } };
    expect((await put({ kidId: kid.id, rules: config })).status).toBe(200);
    const res = await getRules({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { rules } = await res.json() as { rules: { kidId: string | null }[] };
    expect(rules.some(r => r.kidId === kid.id)).toBe(true);
  });
});
