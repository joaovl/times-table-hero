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
