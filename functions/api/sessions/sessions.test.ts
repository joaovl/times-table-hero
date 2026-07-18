import { describe, it, expect, beforeEach } from 'vitest';
import { resolve } from 'node:path';
import { createTestDb } from '../../_lib/auth/__testutils__/testdb';
import { onRequestPost as signup } from '../auth/signup';
import { onRequestPost as createKidRoute } from '../kids/index';
import { onRequestPost as logSessions } from './index';
import { onRequestPost as pair } from '../pair/index';
import { onRequestPost as kidSignin } from '../kid/signin';
import { listSessions } from '../../_lib/sessions/repo';
import type { Db } from '../../_lib/auth/types';

const MIGRATIONS = [
  resolve(__dirname, '../../../migrations/0001_init.sql'),
  resolve(__dirname, '../../../migrations/0002_login_attempts.sql'),
  resolve(__dirname, '../../../migrations/0003_bugs.sql'),
  resolve(__dirname, '../../../migrations/0004_kid_pins.sql'),
  resolve(__dirname, '../../../migrations/0005_device_pairings.sql'),
  resolve(__dirname, '../../../migrations/0006_kid_sessions.sql'),
];
let db: Db;
let token: string;

beforeEach(async () => {
  db = createTestDb(MIGRATIONS);
  const res = await signup({ request: new Request('https://x/', { method: 'POST', body: JSON.stringify({ email: 'p@x.com', password: 'longenough', pin: '135790' }) }), env: { DB: db } });
  token = (await res.json() as { token: string }).token;
});
const auth = () => ({ Authorization: `Bearer ${token}` });

async function makeKid(pin?: string): Promise<string> {
  const body: Record<string, unknown> = { name: 'Sam', color: 'blue', icon: 'star' };
  if (pin) body.pin = pin;
  const res = await createKidRoute({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify(body) }), env: { DB: db } });
  return (await res.json() as { kid: { id: string } }).kid.id;
}

/** Signs up a fresh parent, pairs a device, creates a PIN'd kid, and signs the kid in. Returns the kid session token and kidId. */
async function makeKidSession(): Promise<{ kidToken: string; kidId: string }> {
  const kidId = await makeKid('417293');
  const pairRes = await pair({ request: new Request('https://x/', { method: 'POST', headers: auth(), body: JSON.stringify({}) }), env: { DB: db } });
  const { token: pairingToken } = (await pairRes.json()) as { token: string };
  const signinRes = await kidSignin({
    request: new Request('https://x/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${pairingToken}` },
      body: JSON.stringify({ kidId, pin: '417293' }),
    }),
    env: { DB: db },
  });
  const { token: kidToken } = (await signinRes.json()) as { token: string };
  return { kidToken, kidId };
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

  it('with a kid session token, attributes sessions to that kid without a body kidId', async () => {
    const { kidToken, kidId } = await makeKidSession();
    const res = await logSessions({
      request: new Request('https://x/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ sessions: [session('s1')] }),
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(201);
    expect((await listSessions(db, kidId)).length).toBe(1);
  });

  it('with a kid session token, a matching body kidId also works', async () => {
    const { kidToken, kidId } = await makeKidSession();
    const res = await logSessions({
      request: new Request('https://x/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ kidId, sessions: [session('s1')] }),
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(201);
    expect((await listSessions(db, kidId)).length).toBe(1);
  });

  it('with a kid session token, a mismatched body kidId is rejected (400 kid_mismatch)', async () => {
    const { kidToken } = await makeKidSession();
    const res = await logSessions({
      request: new Request('https://x/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ kidId: 'some-other-kid', sessions: [session('s1')] }),
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: string }).toMatchObject({ error: 'kid_mismatch' });
  });

  it('a kid session token cannot write another kid\'s practice', async () => {
    const { kidToken } = await makeKidSession();
    const otherKidId = await makeKid();
    const res = await logSessions({
      request: new Request('https://x/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ kidId: otherKidId, sessions: [session('s1')] }),
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect((await listSessions(db, otherKidId)).length).toBe(0);
  });
});
