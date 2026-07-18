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
