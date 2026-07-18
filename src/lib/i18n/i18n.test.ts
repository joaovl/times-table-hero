// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { t, getLocale, setLocale, detectLocale, subscribe } from './i18n';

beforeEach(() => { localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

describe('t()', () => {
  it('returns the English string with interpolation', () => {
    expect(t('play.score', { n: 7 })).toBe('Score: 7');
  });
  it('picks plural form from params.count', () => {
    expect(t('play.questionsLeft', { count: 1 })).toBe('1 question left');
    expect(t('play.questionsLeft', { count: 4 })).toBe('4 questions left');
  });
  it('falls back to English for a key missing in the active locale', () => {
    setLocale('pt'); // pt.json does not exist yet in this task
    expect(t('common.save')).toBe('Save');
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
