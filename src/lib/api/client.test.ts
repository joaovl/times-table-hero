// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenStore, authSignup, authLogin, authLogout, authMe, ApiError } from './client';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe('authSignup', () => {
  it('stores the token and returns the account', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okJson(201, { token: 'tok1', account: { id: 'a1', email: 'p@x.com' } }),
    );
    const account = await authSignup('p@x.com', 'longenough');
    expect(account).toEqual({ id: 'a1', email: 'p@x.com' });
    expect(tokenStore.get()).toBe('tok1');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST' }));
  });

  it('throws ApiError with the server code on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(409, { error: 'email_taken' }));
    await expect(authSignup('p@x.com', 'longenough')).rejects.toMatchObject({ code: 'email_taken', status: 409 });
    expect(tokenStore.get()).toBeNull();
  });
});

describe('authLogin', () => {
  it('attaches the stored token as a Bearer header on later calls', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(okJson(200, { token: 'tok2', account: { id: 'a1', email: 'p@x.com' } }));
    await authLogin('p@x.com', 'longenough'); // this call sets the token
    fetchMock.mockClear(); // forget the login call so calls[0] is the next request
    fetchMock.mockResolvedValue(okJson(200, { account: { id: 'a1', email: 'p@x.com' } }));
    await authMe();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok2');
  });
});

describe('authMe', () => {
  it('returns null (not throw) when unauthenticated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(401, { error: 'unauthorized' }));
    expect(await authMe()).toBeNull();
  });
});

describe('authLogout', () => {
  it('clears the token', async () => {
    tokenStore.set('tok3');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await authLogout();
    expect(tokenStore.get()).toBeNull();
  });
});

describe('ApiError', () => {
  it('is an Error carrying code + status', () => {
    const e = new ApiError('bad', 400);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('bad');
    expect(e.status).toBe(400);
  });
});
