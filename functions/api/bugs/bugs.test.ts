import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as postBug, onRequestGet as listBugs } from './index';
import { onRequestGet as getBug } from './[id]';
import { onRequestPost as resolveBugRoute } from '../agent/bugs/resolve';
import type { Db } from '../../_lib/auth/types';

const MIGRATION = resolve(__dirname, '../../../migrations/0003_bugs.sql');
let db: Db;
const TOKEN = 'secret-agent-token';

beforeEach(() => { db = createTestDb([MIGRATION]); });

const post = (body: unknown) =>
  postBug({ request: new Request('https://x/api/bugs', { method: 'POST', body: JSON.stringify(body) }), env: { DB: db } });

const validBug = (over: Record<string, unknown> = {}) => ({
  title: 'Wrong answer marked correct', body: 'On coordinates, -2,-3 was rejected', severity: 'high',
  context: { recent: [{ module: 'shapes', typed: '-2,-3' }] }, url: 'https://x/shapes', reporter: 'p@x.com', ...over,
});

describe('POST /api/bugs (open intake)', () => {
  it('accepts a valid report and returns an id', async () => {
    const res = await post(validBug());
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number; status: string };
    expect(body.id).toBeGreaterThan(0);
    expect(body.status).toBe('open');
  });

  it('rejects missing title or body (400)', async () => {
    expect((await post({ body: 'x', severity: 'low' })).status).toBe(400);
    expect((await post({ title: 'x', severity: 'low' })).status).toBe(400);
  });

  it('rejects an over-long title/body and a bad severity (400)', async () => {
    expect((await post(validBug({ title: 'a'.repeat(201) }))).status).toBe(400);
    expect((await post(validBug({ body: 'a'.repeat(8001) }))).status).toBe(400);
    expect((await post(validBug({ severity: 'urgent' }))).status).toBe(400);
  });
});

describe('GET /api/bugs/:id (public poll)', () => {
  it('returns privacy-safe fields only (no body / reporter / context)', async () => {
    const id = (await (await post(validBug())).json() as { id: number }).id;
    const res = await getBug({ request: new Request(`https://x/api/bugs/${id}`), env: { DB: db }, params: { id: String(id) } });
    expect(res.status).toBe(200);
    const bug = await res.json() as Record<string, unknown>;
    expect(bug).toHaveProperty('status', 'open');
    expect(bug).not.toHaveProperty('body');
    expect(bug).not.toHaveProperty('reporter');
    expect(bug).not.toHaveProperty('context_json');
  });

  it('404s an unknown id', async () => {
    const res = await getBug({ request: new Request('https://x/api/bugs/999'), env: { DB: db }, params: { id: '999' } });
    expect(res.status).toBe(404);
  });
});

describe('agent listing + resolve (token-gated)', () => {
  it('listing is 404 without the token, returns open bugs with it', async () => {
    await post(validBug());
    const noTok = await listBugs({ request: new Request('https://x/api/bugs'), env: { DB: db, AGENT_TOKEN: TOKEN } });
    expect(noTok.status).toBe(404);
    const withTok = await listBugs({ request: new Request(`https://x/api/bugs?token=${TOKEN}`), env: { DB: db, AGENT_TOKEN: TOKEN } });
    expect(withTok.status).toBe(200);
    expect((await withTok.json() as { count: number }).count).toBe(1);
  });

  it('resolve flips status to fixed and the public poll reflects it', async () => {
    const id = (await (await post(validBug())).json() as { id: number }).id;
    const bad = await resolveBugRoute({ request: new Request('https://x/api/agent/bugs/resolve', { method: 'POST', body: JSON.stringify({ bug_id: id, status: 'fixed', resolution_md: 'fixed it' }) }), env: { DB: db, AGENT_TOKEN: TOKEN } });
    expect(bad.status).toBe(404); // no token

    const ok = await resolveBugRoute({ request: new Request(`https://x/api/agent/bugs/resolve?token=${TOKEN}`, { method: 'POST', body: JSON.stringify({ bug_id: id, status: 'fixed', resolution_md: 'Spacing now accepted; regression test added.' }) }), env: { DB: db, AGENT_TOKEN: TOKEN } });
    expect(ok.status).toBe(200);

    const poll = await getBug({ request: new Request(`https://x/api/bugs/${id}`), env: { DB: db }, params: { id: String(id) } });
    const bug = await poll.json() as { status: string; resolution_md: string };
    expect(bug.status).toBe('fixed');
    expect(bug.resolution_md).toContain('regression test');
  });
});
