// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { kidsList, kidsCreate, kidsDelete, rulesList, rulesPut, tokenStore } from './client';
import { DEFAULT_RULES } from '@/lib/rewards-types';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => { localStorage.clear(); tokenStore.set('t'); vi.restoreAllMocks(); });
afterEach(() => vi.restoreAllMocks());

describe('kids client', () => {
  it('lists kids', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { kids: [{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }] }));
    expect((await kidsList()).map(k => k.name)).toEqual(['Sam']);
  });

  it('creates a kid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(201, { kid: { id: 'k1', name: 'Sam', color: 'blue', icon: 'star' } }));
    expect((await kidsCreate({ name: 'Sam', color: 'blue', icon: 'star' })).id).toBe('k1');
  });

  it('throws ApiError on a bad create', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(400, { error: 'invalid_input' }));
    await expect(kidsCreate({ name: '', color: 'blue', icon: 'star' })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('deletes a kid', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await kidsDelete('k1');
    expect(f).toHaveBeenCalledWith('/api/kids/k1', expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('rules client', () => {
  it('lists rules', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { rules: [{ kidId: null, config: DEFAULT_RULES, updatedAt: 't' }] }));
    expect((await rulesList())[0].kidId).toBeNull();
  });

  it('puts rules', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await rulesPut('k1', DEFAULT_RULES);
    expect(f).toHaveBeenCalledWith('/api/rules', expect.objectContaining({ method: 'PUT' }));
  });
});
