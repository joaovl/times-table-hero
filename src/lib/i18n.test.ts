import { describe, it, expect, beforeEach } from 'vitest';

// Minimal in-memory localStorage shim for the Node test environment.
// Mirrors the pattern used by `src/modules/times-tables/storage.test.ts`.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
}
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

import { t, getLocale, setLocale } from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    // Reset persisted locale before each test so getLocale() starts from
    // the en-GB default. clear() is safe here — tests don't share state.
    localStorage.clear();
  });

  it('returns the en-GB string for a known key', () => {
    expect(t('hub.title')).toBe('Maths Challenge');
  });

  it('interpolates {name} placeholders from vars', () => {
    expect(t('hub.greeting', { name: 'Sam' })).toBe(
      'Hi Sam! Pick what to practise today'
    );
  });

  it('returns the key itself when nothing matches', () => {
    expect(t('completely.missing.key')).toBe('completely.missing.key');
  });

  it('falls back to en-GB when the active locale has no entry', () => {
    setLocale('cy');
    // cy dictionary is intentionally empty — must fall through to en-GB.
    expect(t('hub.title')).toBe('Maths Challenge');
  });

  it('persists the locale across getLocale() reads', () => {
    setLocale('fr');
    expect(getLocale()).toBe('fr');
    // And it survives reading from a fresh call (mimics next pageview).
    expect(localStorage.getItem('locale')).toBe('fr');
  });

  it('defaults to en-GB when nothing is stored', () => {
    expect(getLocale()).toBe('en-GB');
  });

  it('ignores an unrecognised stored locale and defaults to en-GB', () => {
    localStorage.setItem('locale', 'klingon');
    expect(getLocale()).toBe('en-GB');
  });

  it('leaves unknown {placeholders} in place', () => {
    // hub.greeting only knows {name}; an unrelated var should not crash.
    expect(t('hub.greeting', { other: 'x' })).toContain('{name}');
  });
});
