import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestGet as listKidsRoute, onRequestPost as createKidRoute } from './index';
import { onRequestDelete as deleteKidRoute } from './[id]';
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

describe('/api/kids', () => {
  it('requires authentication', async () => {
    const res = await listKidsRoute({ request: new Request('https://x/'), env: { DB: db } });
    expect(res.status).toBe(401);
  });

  it('creates and lists kids for the account', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    expect(created.status).toBe(201);
    const { kid } = await created.json() as { kid: { id: string; name: string } };
    expect(kid.name).toBe('Sam');

    const listed = await listKidsRoute({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    const { kids } = await listed.json() as { kids: { name: string }[] };
    expect(kids.map(k => k.name)).toEqual(['Sam']);
  });

  it('rejects an empty name with 400', async () => {
    const res = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: '  ', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
  });

  it('deletes a kid by id', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    const { kid } = await created.json() as { kid: { id: string } };
    const del = await deleteKidRoute({ request: new Request('https://x/', { method: 'DELETE', headers: auth() }), env: { DB: db }, params: { id: kid.id } });
    expect(del.status).toBe(200);
    const listed = await listKidsRoute({ request: new Request('https://x/', { headers: auth() }), env: { DB: db } });
    expect((await listed.json() as { kids: unknown[] }).kids).toHaveLength(0);
  });
});
