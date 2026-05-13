/**
 * Lightweight, hand-rolled i18n scaffold.
 *
 * Goals:
 *   - No external dependencies (no i18next, no react-intl).
 *   - en-GB is the source of truth and current default.
 *   - Other locales (cy, es, fr) are placeholder stubs so contributors
 *     can fill them in without further plumbing.
 *   - Missing keys fall back to en-GB, then to the key itself — that way
 *     untranslated UI strings are visible during development rather than
 *     rendering as empty space.
 *
 * Usage:
 *   import { t, useLocale } from '@/lib/i18n';
 *   <h1>{t('hub.title')}</h1>
 *   <p>{t('hub.greeting', { name: 'Sam' })}</p>
 *
 * Adding a translation: see `src/lib/locales/en-GB.ts` and CONTRIBUTING.md.
 */
import { useEffect, useState } from 'react';

import enGB from './locales/en-GB';
import cy from './locales/cy';
import es from './locales/es';
import fr from './locales/fr';

export type Locale = 'en-GB' | 'cy' | 'es' | 'fr';

const STORAGE_KEY = 'locale';
const DEFAULT_LOCALE: Locale = 'en-GB';
const SUPPORTED: readonly Locale[] = ['en-GB', 'cy', 'es', 'fr'];

type Dictionary = Record<string, string>;

const DICTIONARIES: Record<Locale, Dictionary> = {
  'en-GB': enGB,
  cy,
  es,
  fr,
};

function isLocale(value: string | null): value is Locale {
  return value !== null && (SUPPORTED as readonly string[]).includes(value);
}

export function getLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode, SSR). Fall through to default.
  }
  return DEFAULT_LOCALE;
}

export function setLocale(l: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // ignore — we still emit the change so live components update
  }
  emit();
}

/**
 * Interpolate `{name}` placeholders in a translation string with values
 * from `vars`. Missing variables are left as-is so they're easy to spot.
 */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = getLocale();
  const primary = DICTIONARIES[locale]?.[key];
  if (primary !== undefined) return interpolate(primary, vars);

  // Fallback chain: requested locale -> en-GB -> key itself.
  if (locale !== DEFAULT_LOCALE) {
    const fallback = DICTIONARIES[DEFAULT_LOCALE]?.[key];
    if (fallback !== undefined) return interpolate(fallback, vars);
  }
  return key;
}

// Tiny event emitter so `useLocale` consumers re-render when the locale
// changes. A full pub/sub library would be overkill for a single channel.
type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * React hook returning `[locale, setLocale]`. Consumers re-render whenever
 * any code in the app calls `setLocale`.
 */
export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());

  useEffect(() => {
    const listener = () => setLocaleState(getLocale());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [locale, setLocale];
}
