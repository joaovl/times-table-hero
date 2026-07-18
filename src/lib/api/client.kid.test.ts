// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  tokenStore, pairingTokenStore, kidTokenStore, currentKid,
  pairKids, kidSignin, kidSignout, sessionsLog, ApiError,
} from './client';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const authOf = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => vi.restoreAllMocks());

describe('pairKids', () => {
  it('sends the device-pairing token (not the parent token)', async () => {
    tokenStore.set('parent-tok');
    pairingTokenStore.set('pair-tok');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okJson(200, { kids: [{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }] }),
    );
    const kids = await pairKids();
    expect(kids).toHaveLength(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(authOf(init)).toBe('Bearer pair-tok');
  });
});

describe('kidSignin', () => {
  const kid = { id: 'k1', name: 'Sam', color: 'blue', icon: 'star' };

  it('signs in with the pairing token and stores the kid token + current kid', async () => {
    pairingTokenStore.set('pair-tok');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { token: 'kid-tok' }));
    await kidSignin(kid, '135790');
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/kid/signin');
    expect(authOf(init)).toBe('Bearer pair-tok');
    expect(JSON.parse(init.body as string)).toEqual({ kidId: 'k1', pin: '135790' });
    expect(kidTokenStore.get()).toBe('kid-tok');
    expect(currentKid()).toEqual(kid);
  });

  it('throws and stores nothing on a wrong PIN', async () => {
    pairingTokenStore.set('pair-tok');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(401, { error: 'unauthorized' }));
    await expect(kidSignin(kid, '000000')).rejects.toBeInstanceOf(ApiError);
    expect(kidTokenStore.get()).toBeNull();
    expect(currentKid()).toBeNull();
  });

  it('kidSignout clears the kid token and current kid', async () => {
    kidTokenStore.set('kid-tok');
    localStorage.setItem('tth_current_kid', JSON.stringify(kid));
    kidSignout();
    expect(kidTokenStore.get()).toBeNull();
    expect(currentKid()).toBeNull();
  });
});

describe('sessionsLog token selection', () => {
  const sessions = [{ id: 's1', startedAt: 'a', endedAt: 'b', durationSec: 1, module: 'm', correct: 1, total: 1, topics: [] }];

  it('uses the kid session token when a kid is signed in', async () => {
    tokenStore.set('parent-tok');
    kidTokenStore.set('kid-tok');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(201, { inserted: 1 }));
    await sessionsLog('k1', sessions);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(authOf(init)).toBe('Bearer kid-tok');
  });

  it('falls back to the parent token when no kid is signed in', async () => {
    tokenStore.set('parent-tok');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(201, { inserted: 1 }));
    await sessionsLog('k1', sessions);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(authOf(init)).toBe('Bearer parent-tok');
  });
});
