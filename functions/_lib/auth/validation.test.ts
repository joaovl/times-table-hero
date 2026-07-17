import { describe, it, expect } from 'vitest';
import { normalizeEmail, isValidEmail, isValidPassword, isValidPin } from './validation';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Parent@Example.COM ')).toBe('parent@example.com');
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('requires at least 8 characters', () => {
    expect(isValidPassword('7chars!')).toBe(false);
    expect(isValidPassword('eightchr')).toBe(true);
  });
});

describe('isValidPin', () => {
  it('accepts exactly six digits', () => {
    expect(isValidPin('012345')).toBe(true);
    expect(isValidPin('999999')).toBe(true);
  });
  it('rejects wrong length or non-digits', () => {
    expect(isValidPin('12345')).toBe(false);   // 5 digits
    expect(isValidPin('1234567')).toBe(false); // 7 digits
    expect(isValidPin('12 45 6')).toBe(false);
    expect(isValidPin('abcdef')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});
