// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { t, getLocale, setLocale, detectLocale, subscribe, registerCatalog } from './i18n';
import pt from './locales/pt.json';

beforeEach(() => { localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe('t()', () => {
  beforeEach(() => { setLocale('en'); });
  it('returns the English string with interpolation', () => {
    expect(t('play.score', { n: 7 })).toBe('Score: 7');
  });
  it('picks plural form from params.count', () => {
    expect(t('play.questionsLeft', { count: 1 })).toBe('1 question left');
    expect(t('play.questionsLeft', { count: 4 })).toBe('4 questions left');
  });
  it('translates via the active catalog and falls back to English for missing keys', () => {
    // Register a deliberately partial catalog to exercise the fallback path.
    registerCatalog('pt', { 'common.back': 'Voltar' });
    setLocale('pt');
    try {
      expect(t('common.back')).toBe('Voltar'); // present → translated
      expect(t('common.save')).toBe('Save');   // missing → English fallback
    } finally {
      registerCatalog('pt', pt as unknown as Record<string, string>); // restore
    }
  });
});

describe('locale store', () => {
  it('setLocale persists and notifies subscribers', () => {
    const spy = vi.fn();
    const un = subscribe(spy);
    setLocale('fr');
    expect(getLocale()).toBe('fr');
    expect(localStorage.getItem('tth_lang')).toBe('fr');
    expect(spy).toHaveBeenCalled();
    un();
  });
});

describe('detectLocale', () => {
  it('prefers tth_lang over navigator', () => {
    localStorage.setItem('tth_lang', 'es');
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    expect(detectLocale()).toBe('es');
  });
  it('prefix-matches navigator.language (pt-BR -> pt)', () => {
    vi.stubGlobal('navigator', { language: 'pt-BR' });
    expect(detectLocale()).toBe('pt');
  });
  it('falls back to en for unsupported languages', () => {
    vi.stubGlobal('navigator', { language: 'ja-JP' });
    expect(detectLocale()).toBe('en');
  });
});
