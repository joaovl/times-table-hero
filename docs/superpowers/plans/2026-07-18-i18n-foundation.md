# i18n Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user-facing string lives in per-language JSON (`en`/`pt`/`es`/`fr`), detected from the device language, overridable in the parent area, switching instantly — plus locale-aware number input/display, currency swap in the money module, and imperial gating in conversions.

**Architecture:** A tiny hand-rolled i18n core (no i18next): `en.json` is the typed source of truth; a module-level locale store (subscribable via `useSyncExternalStore`) lets both React components and pure question generators call the same `t()`. Locale numbers go through one format/parse boundary; graders keep operating on plain numbers. Money's existing `formatMoney`/`parseMoney` choke point is parameterized by a `CurrencyConfig`.

**Tech Stack:** React 18, TypeScript (`resolveJsonModule`), Vite, Vitest (jsdom), Playwright.

## Global Constraints

- Launch languages: `en` (source of truth), `pt`, `es`, `fr` — exactly these four.
- Language is device-wide: stored in `localStorage['tth_lang']`; detection order is `tth_lang` → `navigator.language` prefix match (`pt-BR` → `pt`) → `en`.
- Missing keys in non-en files MUST fall back to the English string at runtime; never render a raw key or blank.
- `t()` keys are compile-time checked: `type MessageKey = keyof typeof en` from the JSON import. A bad key must be a `tsc` error.
- No new runtime dependencies (no i18next).
- Typed numeric answers must accept BOTH `.` and `,` as decimal separator in comma locales; graders continue to receive plain `number`s.
- Currency map: `en-GB`→GBP £, `en-US`→USD $, `pt-PT`/`es`/`fr`→EUR €, `pt-BR`→BRL R$. Money amounts stay integer minor units internally.
- Imperial conversion skills are offered only under `en` locales.
- The e2e suite runs in `en`; `e2e/support` label tables must be imported from `en.json`, not hardcoded.
- Every task ends with `npx vitest run` green and `npx tsc --noEmit` (via `npm run build` or `npx tsc -p tsconfig.json --noEmit`) clean.
- All 1919 existing tests keep passing after every task; existing English UI text must not change wording during extraction (copy-move, not copy-edit).

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/i18n/locales/en.json` | Source-of-truth strings, flat dot keys |
| `src/lib/i18n/locales/{pt,es,fr}.json` | Translations (same keys; `_meta.status`) |
| `src/lib/i18n/i18n.ts` | Locale store, detection, `t()`, plural/interpolation |
| `src/lib/i18n/react.tsx` | `LocaleProvider`, `useT()` (useSyncExternalStore bridge) |
| `src/lib/i18n/number.ts` | `formatNumber`, `parseAnswer` |
| `src/lib/i18n/currency.ts` | `CurrencyConfig`, `currencyForLocale` |
| `src/modules/money/logic.ts` | `formatMoney`/`parseMoney` gain optional `CurrencyConfig` param |
| `src/pages/parent/LanguageCard.tsx` | Parent-area language selector |
| everything else | callers switch string literals to `t()` keys |

---

### Task 1: i18n core — locale store, detection, `t()`

**Files:**
- Create: `src/lib/i18n/locales/en.json`
- Create: `src/lib/i18n/i18n.ts`
- Create: `src/lib/i18n/react.tsx`
- Test: `src/lib/i18n/i18n.test.ts`

**Interfaces:**
- Produces:
  - `type Locale = 'en' | 'pt' | 'es' | 'fr'`; `const SUPPORTED_LOCALES: Locale[]`
  - `getLocale(): Locale`, `setLocale(l: Locale): void` (persists to `tth_lang`, notifies subscribers), `subscribe(fn: () => void): () => void`
  - `detectLocale(): Locale` (pure; reads localStorage + navigator)
  - `t(key: MessageKey, params?: Record<string, string | number>): string`
  - `type MessageKey = keyof typeof en`
  - React: `LocaleProvider({children})`, `useT(): { t: typeof t; locale: Locale; setLocale: typeof setLocale }`
- Consumes: nothing.

- [ ] **Step 1: Enable JSON imports if not already on.** Check `tsconfig.json` (and `tsconfig.app.json` if present) has `"resolveJsonModule": true` under `compilerOptions`; add it if missing.

- [ ] **Step 2: Seed `en.json`** with the keys the tests below use (more keys arrive in later tasks):

```json
{
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.back": "Back",
  "play.score": "Score: {n}",
  "play.questionsLeft.one": "{count} question left",
  "play.questionsLeft.other": "{count} questions left",
  "parent.language.title": "Language",
  "parent.language.help": "Applies to everyone on this device."
}
```

- [ ] **Step 3: Write the failing tests** (`src/lib/i18n/i18n.test.ts`):

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { t, getLocale, setLocale, detectLocale, subscribe } from './i18n';

beforeEach(() => { localStorage.clear(); setLocale('en'); });
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
```

- [ ] **Step 4: Run tests, verify FAIL** — `npx vitest run src/lib/i18n/i18n.test.ts` — expect module-not-found.

- [ ] **Step 5: Implement `src/lib/i18n/i18n.ts`:**

```ts
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
```

Note: the plural test calls `t('play.questionsLeft', …)` but only `play.questionsLeft.one/.other` exist in `en.json` — so `MessageKey` won't include the bare key. Fix by widening the plural path: declare `t(key: MessageKey | PluralKey, …)` where `type PluralKey = MessageKey extends `${infer B}.one` ? B : never` is over-clever — instead keep it simple and pragmatic: add `"play.questionsLeft": "{count} questions left"` (the `other` text) to `en.json` as the bare fallback too. Do that: the bare key exists AND the `.one`/`.other` variants exist. This is the convention for every plural string in this codebase.

- [ ] **Step 6: Implement `src/lib/i18n/react.tsx`:**

```tsx
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { t, getLocale, setLocale, subscribe, type Locale } from './i18n';

interface LocaleCtx { t: typeof t; locale: Locale; setLocale: typeof setLocale }
const Ctx = createContext<LocaleCtx>({ t, locale: 'en', setLocale });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, () => 'en' as Locale);
  return <Ctx.Provider value={{ t, locale, setLocale }}>{children}</Ctx.Provider>;
}

export function useT(): LocaleCtx {
  return useContext(Ctx);
}
```

- [ ] **Step 7: Run tests, verify PASS** — `npx vitest run src/lib/i18n/i18n.test.ts`; then `npx vitest run` (whole suite) and `npx tsc --noEmit` (or the project's build check).

- [ ] **Step 8: Commit** — `git add src/lib/i18n tsconfig*.json && git commit -m "feat(i18n): locale store, typed t(), detection, LocaleProvider"`

---

### Task 2: Locale numbers — `formatNumber` / `parseAnswer`

**Files:**
- Create: `src/lib/i18n/number.ts`
- Test: `src/lib/i18n/number.test.ts`

**Interfaces:**
- Consumes: `getLocale()` from Task 1.
- Produces: `formatNumber(n: number, opts?: Intl.NumberFormatOptions): string`; `parseAnswer(s: string): number | null` (accepts `.` and locale `,`, strips grouping, returns null when unparseable).

- [ ] **Step 1: Write the failing tests** (`src/lib/i18n/number.test.ts`):

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { setLocale } from './i18n';
import { formatNumber, parseAnswer } from './number';

beforeEach(() => { localStorage.clear(); setLocale('en'); });

describe('formatNumber', () => {
  it('uses dot decimals in en', () => { expect(formatNumber(3.5)).toBe('3.5'); });
  it('uses comma decimals in fr', () => { setLocale('fr'); expect(formatNumber(3.5)).toBe('3,5'); });
  it('does not group 4-digit integers by default (kids type 1250, not 1.250)', () => {
    setLocale('pt');
    expect(formatNumber(1250)).toBe('1250');
  });
});

describe('parseAnswer', () => {
  it('parses plain integers in any locale', () => { expect(parseAnswer('42')).toBe(42); });
  it('accepts dot decimals everywhere', () => { setLocale('fr'); expect(parseAnswer('3.5')).toBe(3.5); });
  it('accepts comma decimals everywhere', () => { expect(parseAnswer('3,5')).toBe(3.5); });
  it('rejects garbage', () => { expect(parseAnswer('3,5,1')).toBeNull(); expect(parseAnswer('abc')).toBeNull(); expect(parseAnswer('')).toBeNull(); });
  it('accepts negative values', () => { expect(parseAnswer('-4,5')).toBe(-4.5); });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run src/lib/i18n/number.test.ts`.

- [ ] **Step 3: Implement `src/lib/i18n/number.ts`:**

```ts
import { getLocale } from './i18n';

// Display: locale-formatted, but no grouping separators by default — kids type
// answers back and "1.250" (pt) vs "1,250" (en) as *thousand* groups would be
// hopelessly confusing next to decimal commas. Callers can opt in via opts.
export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(), { useGrouping: false, maximumFractionDigits: 6, ...opts }).format(n);
}

// Parse a typed numeric answer: both '.' and ',' accepted as the decimal
// separator in every locale (kids on mixed-language devices shouldn't lose a
// point to punctuation). At most one separator total; otherwise null.
export function parseAnswer(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const seps = (trimmed.match(/[.,]/g) ?? []).length;
  if (seps > 1) return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
```

- [ ] **Step 4: Run tests, verify PASS**; run full suite + `tsc`.
- [ ] **Step 5: Commit** — `git commit -m "feat(i18n): locale number formatting and comma-tolerant answer parsing"`

---

### Task 3: Currency configs + parameterized money format/parse

**Files:**
- Create: `src/lib/i18n/currency.ts`
- Modify: `src/modules/money/logic.ts` (`formatMoney`, `parseMoney` get an optional trailing `CurrencyConfig` param, default GBP — all existing call sites and tests stay valid)
- Test: `src/lib/i18n/currency.test.ts`

**Interfaces:**
- Consumes: `getLocale()`.
- Produces:
  - `interface CurrencyConfig { code: 'GBP'|'USD'|'EUR'|'BRL'; symbol: string; minorSuffix: string; denominations: number[] }`
  - `const CURRENCIES: Record<CurrencyConfig['code'], CurrencyConfig>`
  - `currencyForLocale(): CurrencyConfig` — full-tag aware: reads `navigator.language` when locale is `en` (`en-US`→USD else GBP) and `pt` (`pt-BR`→BRL else EUR); `es`/`fr`→EUR.
  - `formatMoney(pence: number, cfg?: CurrencyConfig)` / `parseMoney(input: string, cfg?: CurrencyConfig)` in money logic.

- [ ] **Step 1: Write the failing tests** (`src/lib/i18n/currency.test.ts`):

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setLocale } from './i18n';
import { CURRENCIES, currencyForLocale } from './currency';
import { formatMoney, parseMoney } from '@/modules/money/logic';

beforeEach(() => { localStorage.clear(); setLocale('en'); });
afterEach(() => vi.unstubAllGlobals());

it('en + en-GB navigator -> GBP', () => {
  vi.stubGlobal('navigator', { language: 'en-GB' });
  expect(currencyForLocale().code).toBe('GBP');
});
it('en + en-US navigator -> USD', () => {
  vi.stubGlobal('navigator', { language: 'en-US' });
  expect(currencyForLocale().code).toBe('USD');
});
it('pt + pt-BR navigator -> BRL; pt otherwise -> EUR', () => {
  setLocale('pt');
  vi.stubGlobal('navigator', { language: 'pt-BR' });
  expect(currencyForLocale().code).toBe('BRL');
  vi.stubGlobal('navigator', { language: 'pt-PT' });
  expect(currencyForLocale().code).toBe('EUR');
});
it('fr/es -> EUR', () => {
  setLocale('fr');
  expect(currencyForLocale().code).toBe('EUR');
});

it('formatMoney renders per currency', () => {
  expect(formatMoney(345)).toBe('£3.45');                     // default GBP unchanged
  expect(formatMoney(345, CURRENCIES.EUR)).toBe('3,45 €');
  expect(formatMoney(345, CURRENCIES.USD)).toBe('$3.45');
  expect(formatMoney(345, CURRENCIES.BRL)).toBe('R$3,45');
  expect(formatMoney(75, CURRENCIES.EUR)).toBe('75c');
});
it('parseMoney accepts the currency symbol and comma decimals for EUR/BRL', () => {
  expect(parseMoney('3,45', CURRENCIES.EUR)).toBe(345);
  expect(parseMoney('3,45 €', CURRENCIES.EUR)).toBe(345);
  expect(parseMoney('R$3,45', CURRENCIES.BRL)).toBe(345);
  expect(parseMoney('£3.45')).toBe(345);                      // default GBP unchanged
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `src/lib/i18n/currency.ts`:**

```ts
import { getLocale } from './i18n';

export interface CurrencyConfig {
  code: 'GBP' | 'USD' | 'EUR' | 'BRL';
  symbol: string;          // '£', '$', '€', 'R$'
  symbolBefore: boolean;   // €: false ("3,45 €"), others: true
  decimalComma: boolean;   // EUR/BRL: true
  minorSuffix: string;     // 'p', '¢', 'c', 'c' — used for < 1 unit amounts
  denominations: number[]; // coins+notes in minor units, ascending
}

export const CURRENCIES: Record<CurrencyConfig['code'], CurrencyConfig> = {
  GBP: { code: 'GBP', symbol: '£',  symbolBefore: true,  decimalComma: false, minorSuffix: 'p',
         denominations: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000] },
  USD: { code: 'USD', symbol: '$',  symbolBefore: true,  decimalComma: false, minorSuffix: '¢',
         denominations: [1, 5, 10, 25, 100, 500, 1000, 2000] },
  EUR: { code: 'EUR', symbol: '€',  symbolBefore: false, decimalComma: true,  minorSuffix: 'c',
         denominations: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000] },
  BRL: { code: 'BRL', symbol: 'R$', symbolBefore: true,  decimalComma: true,  minorSuffix: 'c',
         denominations: [5, 10, 25, 50, 100, 200, 500, 1000, 2000] },
};

export function currencyForLocale(): CurrencyConfig {
  const locale = getLocale();
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '') ?? '';
  if (locale === 'en') return nav.toLowerCase().startsWith('en-us') ? CURRENCIES.USD : CURRENCIES.GBP;
  if (locale === 'pt') return nav.toLowerCase().startsWith('pt-br') ? CURRENCIES.BRL : CURRENCIES.EUR;
  return CURRENCIES.EUR;
}
```

- [ ] **Step 4: Generalize `formatMoney`/`parseMoney` in `src/modules/money/logic.ts`.** Keep signatures backward-compatible (optional trailing param, default `CURRENCIES.GBP`); keep pence-integer semantics:

```ts
import { CURRENCIES, type CurrencyConfig } from '@/lib/i18n/currency';

export function formatMoney(pence: number, cfg: CurrencyConfig = CURRENCIES.GBP): string {
  const v = Math.round(pence);
  if (v < 100) return `${v}${cfg.minorSuffix}`;
  const major = Math.floor(v / 100);
  const minor = (v % 100).toString().padStart(2, '0');
  const sep = cfg.decimalComma ? ',' : '.';
  const amount = `${major}${sep}${minor}`;
  return cfg.symbolBefore ? `${cfg.symbol}${amount}` : `${amount} ${cfg.symbol}`;
}

export function parseMoney(input: string, cfg: CurrencyConfig = CURRENCIES.GBP): number | null {
  // Existing body, with two generalizations:
  // 1. strip cfg.symbol (escape for regex) wherever '£' was stripped,
  // 2. before decimal handling, replace ',' with '.' when there is at most one
  //    comma and no dot (comma-decimal input),
  // 3. treat cfg.minorSuffix the way trailing 'p' is treated today.
  // The GBP behavior (bare integer = pence, '345p', '£3.45') must not change —
  // the existing money logic tests are the regression net.
  /* adapt existing implementation in place */
}
```

The implementer adapts the existing `parseMoney` body (it already strips `£`, handles trailing `p`, and decimals) rather than rewriting it; the new tests plus the existing money tests define done.

- [ ] **Step 5: Run new tests + FULL money test file + whole suite; verify PASS.**
- [ ] **Step 6: Commit** — `git commit -m "feat(i18n): currency configs; money format/parse parameterized (GBP default unchanged)"`

---

### Task 4: Mount provider, language selector card, parent-area extraction (part 1)

**Files:**
- Modify: `src/App.tsx` (wrap tree in `LocaleProvider`, translate `ModuleLoading`)
- Create: `src/pages/parent/LanguageCard.tsx`
- Modify: `src/pages/parent/ParentHome.tsx` (render `<LanguageCard/>`, extract strings)
- Modify: `src/pages/parent/ParentAuth.tsx` (extract strings)
- Modify: `src/lib/i18n/locales/en.json` (add the keys)
- Test: `src/pages/parent/LanguageCard.test.tsx`

**Interfaces:**
- Consumes: `useT`, `SUPPORTED_LOCALES`, `setLocale` (Task 1).
- Produces: `LanguageCard` (no props). Key namespace convention consumed by all later tasks: `parent.*`, `auth.*`, `common.*`, `<module>.setup.*`, `<module>.play.*`.

- [ ] **Step 1: Write the failing test** (`src/pages/parent/LanguageCard.test.tsx`):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/lib/i18n/react';
import { setLocale, getLocale } from '@/lib/i18n/i18n';
import LanguageCard from './LanguageCard';

beforeEach(() => { localStorage.clear(); setLocale('en'); });

it('lists each language in its own name and switches instantly', () => {
  render(<LocaleProvider><LanguageCard /></LocaleProvider>);
  const select = screen.getByLabelText('Language');
  expect(screen.getByRole('option', { name: 'Português' })).toBeTruthy();
  fireEvent.change(select, { target: { value: 'fr' } });
  expect(getLocale()).toBe('fr');
  expect(localStorage.getItem('tth_lang')).toBe('fr');
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `LanguageCard.tsx`:**

```tsx
import { useT } from '@/lib/i18n/react';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/i18n';
import { Card } from '@/components/ui/card';

// Each language is labeled in its own name so a mis-set device is recoverable.
const NATIVE_NAMES: Record<Locale, string> = {
  en: 'English', pt: 'Português', es: 'Español', fr: 'Français',
};

export default function LanguageCard() {
  const { t, locale, setLocale } = useT();
  return (
    <Card className="p-5 space-y-2">
      <label className="block font-bold" htmlFor="tth-language">{t('parent.language.title')}</label>
      <select
        id="tth-language"
        aria-label="Language"
        className="border rounded-md px-2 py-1"
        value={locale}
        onChange={e => setLocale(e.target.value as Locale)}
      >
        {SUPPORTED_LOCALES.map(l => <option key={l} value={l}>{NATIVE_NAMES[l]}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">{t('parent.language.help')}</p>
    </Card>
  );
}
```

Note the selector's `aria-label` stays literally `"Language"` in every locale — it is the recovery affordance and the e2e hook.

- [ ] **Step 4: Wrap the app.** In `src/App.tsx`, `import { LocaleProvider } from '@/lib/i18n/react';` and wrap: `<LocaleProvider><AuthProvider><BrowserRouter>…` . Replace `Loading...` in `ModuleLoading` with `{t('common.loading')}` via a `useT()` call inside the component (move `ModuleLoading` below the provider or import `t` directly — importing `t` directly from `i18n.ts` is fine for this one since Suspense fallbacks may render before context).

- [ ] **Step 5: Extract `ParentHome.tsx` and `ParentAuth.tsx`.** The mechanical recipe used by ALL later extraction tasks:
  1. Add `const { t } = useT();` to the component.
  2. Every user-visible string literal (JSX text, `aria-label`, `placeholder`, error message maps) moves to `en.json` under the file's namespace, wording unchanged.
  3. The literal becomes `{t('namespace.key')}` / `t('namespace.key')`.
  4. Params for embedded values: `` `Signed in as ${email}` `` → `"parent.home.signedInAs": "Signed in as {email}"` with a `<span>` split if markup is inside (keep the bold email span: `t('parent.home.signedInAs')` for the prefix text and render the email separately — acceptable to split a sentence at a markup boundary; add distinct keys for each fragment).
  5. Error-code → message maps (`MESSAGES` in ParentAuth/SetupDevice) become code → `MessageKey` maps resolved through `t()` at render.
  Worked example (ParentHome links):

```tsx
<Link className="underline text-primary" to="/parent/kids">{t('parent.home.manageKids')}</Link>
```
```json
"parent.home.manageKids": "Manage kids",
"parent.home.rewardSettings": "Reward settings (the bribe area)",
"parent.home.dashboard": "Progress & rewards dashboard",
"parent.home.linkPlayers": "Link players to your kids",
"parent.home.pairedDevices": "Paired devices",
"parent.home.feedback": "Send feedback / report a problem",
"parent.home.title": "Parent area",
"parent.home.logout": "Log out"
```

  Render `<LanguageCard />` as the last card in `ParentHome`.

- [ ] **Step 6: Run the parent-area component tests + full suite; verify PASS** (they assert English text; default locale in jsdom is `en`, so extraction that preserves wording keeps them green).
- [ ] **Step 7: Commit** — `git commit -m "feat(i18n): LocaleProvider mounted; language selector; parent home/auth extracted"`

---

### Task 5: Parent-area extraction (part 2)

**Files:**
- Modify: `src/pages/parent/ParentKids.tsx`, `src/pages/parent/Dashboard.tsx`, `src/pages/parent/BribeArea.tsx`, `src/pages/parent/RewardRulesForm.tsx`, `src/pages/parent/ParentDevices.tsx`, `src/pages/parent/ParentLink.tsx`, `src/pages/SetupDevice.tsx`, `src/pages/WhosPlaying.tsx`
- Modify: `src/lib/i18n/locales/en.json`
- Tests: the existing co-located `.test.tsx` files are the net; no new tests required unless a component has none.

Apply the Task 4 Step 5 recipe to each file. Specific notes:
- Dynamic aria-labels: `` `Reset PIN for ${k.name}` `` → `"parent.kids.resetPinFor": "Reset PIN for {name}"`, used as `aria-label={t('parent.kids.resetPinFor', { name: k.name })}`.
- `WhosPlaying` PIN error `'That PIN didn’t match. Try again.'` keeps its exact wording (curly apostrophe) in `en.json` — the e2e spec asserts it.
- `SetupDevice`/`WhosPlaying` headings `Who’s playing?` etc. keep exact wording.
- Plural strings, if any arise, follow the bare-key + `.one`/`.other` convention from Task 1.

- [ ] **Step 1: Extract file by file, running that file's co-located test after each** (e.g. `npx vitest run src/pages/WhosPlaying.test.tsx`).
- [ ] **Step 2: Full suite + `tsc` green.**
- [ ] **Step 3: Commit** — `git commit -m "feat(i18n): parent area + device/kid sign-in screens fully extracted"`

---

### Task 6: Shared surfaces — Hub, NotFound, feedback dialog, results/celebration copy

**Files:**
- Modify: `src/pages/Hub.tsx`, `src/pages/NotFound.tsx`, `src/components/FeedbackTrigger.tsx` (and the feedback dialog component it opens), shared game components under `src/components/game/` (GameSetup, results/summary components), `src/lib/typography.ts` only if it embeds copy.
- Modify: `src/lib/i18n/locales/en.json`

Same recipe. Notes:
- Hub module tiles: names/descriptions to `hub.modules.<slug>.name` / `.blurb`.
- Celebration words (`Brilliant!`, `Correct!`, `Nice try!` etc.) live under `play.feedback.*` — extracted once here, reused by every module in Tasks 7–8 (DRY: modules must reference these shared keys, not duplicate them).

- [ ] **Step 1: Extract; co-located tests after each file; full suite green.**
- [ ] **Step 2: Commit** — `git commit -m "feat(i18n): hub, feedback dialog and shared game copy extracted"`

---

### Task 7: Module extraction batch A — times-tables, arithmetic, decimals, number-sense, number-theory, algebra, statistics

**Files:**
- Modify: each module's `*Setup.tsx`, `*Play.tsx`, `*Index.tsx`, and `logic.ts` where question TEXT or skill labels live (e.g. `SKILL_LABELS`, question prompt builders).
- Modify: `src/lib/i18n/locales/en.json`

Recipe additions for `logic.ts` files (pure, non-React):
- Import `t` directly: `import { t } from '@/lib/i18n/i18n';`
- Skill-label records become getter functions so they re-evaluate per locale:
  `export const SKILL_LABELS = {...}` → `export function skillLabel(s: Skill): string { return t(\`<module>.skills.${s}\` as MessageKey); }` — BUT template-literal keys defeat compile-time checking, so instead declare an explicit record:

```ts
const SKILL_KEY: Record<Skill, MessageKey> = { 'add-same': 'fractions.skills.addSame', /* … one entry per skill */ };
export function skillLabel(s: Skill): string { return t(SKILL_KEY[s]); }
```

- Question prompt builders (`"What is 3 × 7?"`) become `t('module.play.whatIs', { a, b })` with keys like `"timesTables.play.whatIs": "What is {a} × {b}?"`.
- Numbers embedded in prompts flow through `formatNumber` from Task 2 where they can carry decimals.
- Logic TESTS that assert English prompt text keep passing because jsdom default locale is `en`; where a test asserted a label record directly, update it to call the new `skillLabel()`.

- [ ] **Step 1: Extract module by module; after each module run its co-located tests.**
- [ ] **Step 2: Full suite + `tsc` green.**
- [ ] **Step 3: Commit per module or per 2–3 modules** — `git commit -m "feat(i18n): extract <modules>"`

---

### Task 8: Module extraction batch B — fractions, shapes, charts, time, money, conversions, word-problems, ratio-proportion

Same as Task 7 (these are the text-heaviest modules — word-problems and money have story templates and `ITEM_NAMES`):
- `ITEM_NAMES` in `money/logic.ts` → keys `money.items.<n>` via an explicit `MessageKey` array; shop-story templates → parameterized keys (`"money.play.buyStory": "{name} buys {item} for {price}. …"`).
- Word-problem story templates likewise — every template string becomes a key with `{}` params; the generator picks keys, `t()` renders.
- Charts/fractions/shapes `SKILL_LABELS`/`CHART_SKILL_LABEL`/`SHAPE_SKILL_LABEL` → `skillLabel()` per the Task 7 record pattern.

- [ ] **Step 1: Extract; co-located tests after each module; full suite + `tsc` green.**
- [ ] **Step 2: Commit** — `git commit -m "feat(i18n): extract remaining modules (batch B)"`

---

### Task 9: Money currency wiring + conversions imperial gating

**Files:**
- Modify: `src/modules/money/MoneyIndex.tsx` / `MoneyPlay.tsx` / `MoneySetup.tsx` — thread `currencyForLocale()` into generation, display, and answer parsing (every `formatMoney(x)` display call and `parseMoney(input)` grading call gains the config; question generation uses `cfg.denominations` for coin questions).
- Modify: `src/modules/conversions/ConversionsSetup.tsx` (or its skill-list source in `logic.ts`) — filter imperial skills unless `getLocale() === 'en'`.
- Test: extend `src/modules/money/logic.test.ts` (or co-located test) with one EUR-path generation test; add a gating test.

- [ ] **Step 1: Write failing tests:** a money generation test asserting that with `CURRENCIES.EUR` the question's rendered amounts contain `€` and no `£`; a conversions test asserting the skill list contains no imperial skills when locale is `fr` and does when `en`:

```ts
it('offers imperial skills only under en', () => {
  setLocale('fr');
  expect(visibleConversionSkills().some(isImperialSkill)).toBe(false);
  setLocale('en');
  expect(visibleConversionSkills().some(isImperialSkill)).toBe(true);
});
```

(The implementer names `visibleConversionSkills()`/`isImperialSkill()` to match the module's existing skill-list export — a filter function exported from `conversions/logic.ts`.)

- [ ] **Step 2: Verify FAIL, implement, verify PASS, full suite green.**
- [ ] **Step 3: Commit** — `git commit -m "feat(i18n): money follows locale currency; imperial conversions gated to en"`

---

### Task 10: Translation files pt/es/fr + key-parity test

**Files:**
- Create: `src/lib/i18n/locales/pt.json`, `es.json`, `fr.json` — full translations of every key in `en.json` at this point; kid-facing copy in simple, warm language; `"_meta": {"status": "draft"}` in es/fr, `"verified"` pending user check in pt.
- Modify: `src/lib/i18n/i18n.ts` — statically import and `registerCatalog` the three files.
- Test: `src/lib/i18n/parity.test.ts`

- [ ] **Step 1: Write the parity test:**

```ts
import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const keys = (o: Record<string, unknown>) => Object.keys(o).filter(k => k !== '_meta').sort();

describe('catalog parity', () => {
  for (const [name, cat] of [['pt', pt], ['es', es], ['fr', fr]] as const) {
    it(`${name} has exactly the en key set`, () => {
      expect(keys(cat as Record<string, unknown>)).toEqual(keys(en));
    });
  }
});
```

- [ ] **Step 2: Write the three catalogs; register them:**

```ts
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
registerCatalog('pt', pt as Record<string, string>);
registerCatalog('es', es as Record<string, string>);
registerCatalog('fr', fr as Record<string, string>);
```

- [ ] **Step 3: Full suite + `tsc` green; commit** — `git commit -m "feat(i18n): pt/es/fr catalogs with key-parity test"`

---

### Task 11: E2e — labels from en.json + language-switch spec

**Files:**
- Modify: `e2e/support/play.ts` — replace the hardcoded `FRACTION_SKILL_LABELS` / `CHART_SKILL_LABELS` / `START_BUTTON_NAME` tables with imports from `src/lib/i18n/locales/en.json` (Playwright runs TS with `resolveJsonModule`; map slugs via the same key convention Tasks 7–8 introduced).
- Create: `e2e/language-switch.spec.ts`

- [ ] **Step 1: Rewrite the label tables:**

```ts
import en from '../../src/lib/i18n/locales/en.json';
const label = (key: keyof typeof en) => en[key] as string;
const START_BUTTON_NAME = label('game.setup.start'); // "Let's Go!" — key created in Task 6
```

- [ ] **Step 2: Write `e2e/language-switch.spec.ts`:**

```ts
import { test, expect } from '@playwright/test';

const email = `e2ei_${Date.now()}@example.com`;

test('parent switches language: instant flip, persists across reload', async ({ page }) => {
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('longenough');
  await page.getByLabel('Family PIN').fill('123456');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  // Switch to Portuguese; the page flips without a reload.
  await page.getByLabel('Language').selectOption('pt');
  await expect(page.getByRole('heading', { name: 'Área dos pais' })).toBeVisible();

  // Persists across reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Área dos pais' })).toBeVisible();

  // Back to English (the selector's aria-label is locale-stable).
  await page.getByLabel('Language').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();
});
```

(If the pt heading in `pt.json` differs from `Área dos pais`, the spec asserts whatever `pt.json` actually says — import the catalog in the spec: `import pt from '../src/lib/i18n/locales/pt.json'` and assert `pt['parent.home.title']`.)

- [ ] **Step 3: Run the full e2e suite** — `npx playwright test` — expect all specs green.
- [ ] **Step 4: Commit** — `git commit -m "test(e2e): labels sourced from en.json; language-switch coverage"`

---

## Self-review record

- Spec coverage: core (§1→T1), numbers (§2→T2), currency (§3→T3+T9), gating (§4→T9), extraction (§5→T4–T8), e2e labels (§5→T11), translations (§6→T10), tests (§7→every task + T10 parity + T11 e2e), phases (§8 = task order). No gaps.
- Placeholder scan: Task 3 Step 4 intentionally adapts an existing function body in place (rewriting `parseMoney` verbatim in the plan would fork it from source); its done-definition is the new + existing test set. Extraction tasks carry a complete recipe + worked examples rather than 600 enumerated strings — the strings ARE the source files.
- Type consistency: `t(key, params)`, `MessageKey`, `Locale`, `CurrencyConfig`, `skillLabel(s)` used identically across tasks.
