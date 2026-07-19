import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const keys = (o: Record<string, unknown>) => Object.keys(o).filter(k => k !== '_meta').sort();

// Every catalog carries exactly the en key set, so a new string cannot ship
// silently untranslated (it must at least be added — English value allowed,
// runtime falls back anyway — which shows up in the catalog diff for review).
describe('catalog parity', () => {
  for (const [name, cat] of [['pt', pt], ['es', es], ['fr', fr]] as const) {
    it(`${name} has exactly the en key set`, () => {
      expect(keys(cat as Record<string, unknown>)).toEqual(keys(en));
    });
  }

  it('interpolation params match en in every catalog', () => {
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const [name, cat] of [['pt', pt], ['es', es], ['fr', fr]] as const) {
      for (const [k, v] of Object.entries(en)) {
        const tv = (cat as Record<string, string>)[k];
        expect(`${name}:${k}:${params(tv)}`).toBe(`${name}:${k}:${params(v)}`);
      }
    }
  });
});
