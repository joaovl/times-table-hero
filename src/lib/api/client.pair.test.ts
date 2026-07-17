// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { pairDevice, pairList, pairRevoke, pairingTokenStore, ApiError } from './client';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => vi.restoreAllMocks());

describe('pairDevice', () => {
  it('posts email + pin and stores the returned token', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { token: 'ptok1' }));
    const result = await pairDevice('p@x.com', '135790');
    expect(result).toEqual({ token: 'ptok1' });
    expect(pairingTokenStore.get()).toBe('ptok1');
    expect(f).toHaveBeenCalledWith('/api/pair', expect.objectContaining({ method: 'POST' }));
    const init = f.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ email: 'p@x.com', pin: '135790' });
  });

  it('throws ApiError with the server code on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(401, { error: 'invalid_credentials' }));
    await expect(pairDevice('p@x.com', '000000')).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 });
    expect(pairingTokenStore.get()).toBeNull();
  });
});

describe('pairList', () => {
  it('returns the device list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, {
      devices: [{ tokenHashPrefix: 'abc12345', label: 'iPad', createdAt: '2026-01-01', expiresAt: '2026-06-01' }],
    }));
    const devices = await pairList();
    expect(devices).toEqual([{ tokenHashPrefix: 'abc12345', label: 'iPad', createdAt: '2026-01-01', expiresAt: '2026-06-01' }]);
  });

  it('throws ApiError on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(401, { error: 'unauthorized' }));
    await expect(pairList()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
  });
});

describe('pairRevoke', () => {
  it('posts the tokenHashPrefix to revoke', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await pairRevoke('abc12345');
    expect(f).toHaveBeenCalledWith('/api/pair/revoke', expect.objectContaining({ method: 'POST' }));
    const init = f.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ tokenHashPrefix: 'abc12345' });
  });

  it('throws ApiError on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(400, { error: 'invalid_input' }));
    await expect(pairRevoke('bad')).rejects.toMatchObject({ code: 'invalid_input', status: 400 });
  });
});
