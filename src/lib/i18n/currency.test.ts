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
