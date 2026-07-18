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
