import { describe, it, expect } from 'vitest';
import { serializeSessionCookie, clearSessionCookie, getRequestToken, SESSION_COOKIE } from './cookies';

describe('session cookie', () => {
  it('serializes with the required security attributes', () => {
    const c = serializeSessionCookie('tok123', 2592000);
    expect(c).toContain(`${SESSION_COOKIE}=tok123`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Path=/');
    expect(c).toContain('Max-Age=2592000');
  });

  it('clears the cookie with Max-Age=0', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('getRequestToken', () => {
  it('prefers the Authorization Bearer header', () => {
    const req = new Request('https://x/', { headers: { Authorization: 'Bearer abc' } });
    expect(getRequestToken(req)).toBe('abc');
  });

  it('falls back to the session cookie', () => {
    const req = new Request('https://x/', { headers: { Cookie: `foo=1; ${SESSION_COOKIE}=xyz; bar=2` } });
    expect(getRequestToken(req)).toBe('xyz');
  });

  it('returns null when neither is present', () => {
    expect(getRequestToken(new Request('https://x/'))).toBeNull();
  });
});
