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
