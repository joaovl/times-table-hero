import en from './locales/en.json';

export type Locale = 'en' | 'pt' | 'es' | 'fr';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'pt', 'es', 'fr'];
export type MessageKey = keyof typeof en;

const LANG_KEY = 'tth_lang';

// Non-en catalogs are loaded lazily-eager: static imports keep this simple and
// the files are small; Vite bundles them into the main chunk (~a few KB each).
// Added in Task 9; until then the record holds only en.
const catalogs: Partial<Record<Locale, Record<string, string>>> = { en };

export function registerCatalog(locale: Locale, messages: Record<string, string>): void {
  catalogs[locale] = messages;
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && (SUPPORTED_LOCALES as string[]).includes(saved)) return saved as Locale;
  } catch { /* storage unavailable */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  const prefix = (nav ?? '').slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as string[]).includes(prefix) ? (prefix as Locale) : 'en';
}

let current: Locale = detectLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale { return current; }

export function setLocale(l: Locale): void {
  current = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function lookup(key: string): string | undefined {
  return catalogs[current]?.[key] ?? (en as Record<string, string>)[key];
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let raw: string | undefined;
  if (params && typeof params.count === 'number') {
    const suffix = params.count === 1 ? 'one' : 'other';
    raw = lookup(`${key}.${suffix}`);
  }
  raw = raw ?? lookup(key);
  if (raw === undefined) return key; // should not happen: key is compile-checked
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    name in params ? String(params[name]) : m,
  );
}
