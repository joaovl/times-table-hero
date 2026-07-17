import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestGet as listKidsRoute, onRequestPost as createKidRoute } from './index';
import { onRequestDelete as deleteKidRoute, onRequestPut as putKidRoute } from './[id]';
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

  it('stores a hashed kid PIN on create and never returns it', async () => {
    const res = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star', pin: '246810' }) }),
      env: { DB: db },
    });
    expect(res.status).toBe(201);
    const created = await res.json() as { kid: { id: string } & Record<string, unknown> };
    expect('pin' in created.kid || 'pin_hash' in created.kid || 'pinHash' in created.kid).toBe(false);
    expect('accountId' in created.kid).toBe(false);
    const row = await db.prepare('SELECT pin_hash, pin_salt FROM kids WHERE id = ?')
      .bind(created.kid.id).first<{ pin_hash: string | null; pin_salt: string | null }>();
    expect(row?.pin_hash).toBeTruthy();
    expect(row?.pin_hash).not.toBe('246810');
  });

  it('rejects a malformed kid PIN on create', async () => {
    const res = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star', pin: '99' }) }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
  });

  it('creates a kid without a PIN (columns stay null)', async () => {
    const res = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    expect(res.status).toBe(201);
    const created = await res.json() as { kid: { id: string } };
    const row = await db.prepare('SELECT pin_hash, pin_salt FROM kids WHERE id = ?')
      .bind(created.kid.id).first<{ pin_hash: string | null; pin_salt: string | null }>();
    expect(row?.pin_hash).toBeNull();
    expect(row?.pin_salt).toBeNull();
  });

  it('resets a kid PIN on edit and leaves it unchanged when omitted', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star', pin: '111111' }) }),
      env: { DB: db },
    });
    const { kid } = await created.json() as { kid: { id: string } };

    const firstRow = await db.prepare('SELECT pin_hash FROM kids WHERE id = ?').bind(kid.id).first<{ pin_hash: string }>();

    const editedNoPin = await putKidRoute({
      request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify({ name: 'Sammy', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
      params: { id: kid.id },
    });
    expect(editedNoPin.status).toBe(200);
    const unchangedRow = await db.prepare('SELECT pin_hash FROM kids WHERE id = ?').bind(kid.id).first<{ pin_hash: string }>();
    expect(unchangedRow?.pin_hash).toBe(firstRow?.pin_hash);

    const editedWithPin = await putKidRoute({
      request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify({ name: 'Sammy', color: 'blue', icon: 'star', pin: '222222' }) }),
      env: { DB: db },
      params: { id: kid.id },
    });
    expect(editedWithPin.status).toBe(200);
    const editedBody = await editedWithPin.json() as { kid: Record<string, unknown> };
    expect('pin' in editedBody.kid || 'pin_hash' in editedBody.kid).toBe(false);
    const changedRow = await db.prepare('SELECT pin_hash FROM kids WHERE id = ?').bind(kid.id).first<{ pin_hash: string }>();
    expect(changedRow?.pin_hash).not.toBe(firstRow?.pin_hash);
  });

  it('rejects a malformed kid PIN on edit', async () => {
    const created = await createKidRoute({
      request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star' }) }),
      env: { DB: db },
    });
    const { kid } = await created.json() as { kid: { id: string } };
    const res = await putKidRoute({
      request: new Request('https://x/', { method: 'PUT', headers: auth(), body: JSON.stringify({ name: 'Sam', color: 'blue', icon: 'star', pin: 'abcdef' }) }),
      env: { DB: db },
      params: { id: kid.id },
    });
    expect(res.status).toBe(400);
  });
});
