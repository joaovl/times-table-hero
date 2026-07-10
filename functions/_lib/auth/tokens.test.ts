import { describe, it, expect } from 'vitest';
import { generateSessionToken, hashToken, sessionExpiry } from './tokens';

describe('session tokens', () => {
  it('generates distinct, non-empty tokens', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('hashes deterministically and does not return the raw token', async () => {
    const t = generateSessionToken();
    expect(await hashToken(t)).toBe(await hashToken(t));
    expect(await hashToken(t)).not.toBe(t);
  });

  it('computes an expiry N days ahead', () => {
    expect(sessionExpiry(new Date('2026-07-10T00:00:00Z'), 30)).toBe('2026-08-09T00:00:00.000Z');
  });
});
