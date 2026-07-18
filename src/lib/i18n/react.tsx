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
