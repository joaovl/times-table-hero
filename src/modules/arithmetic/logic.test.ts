import { describe, it, expect } from 'vitest';
import { countCarries, countBorrows } from './logic';

describe('countCarries', () => {
  it.each([
    [123, 456, 0],
    [19, 1, 1],
    [99, 1, 2],
    [999, 1, 3],
    [12345, 67890, 3],
  ])('countCarries(%i, %i) = %i', (a, b, expected) => {
    expect(countCarries(a, b)).toBe(expected);
  });
});

describe('countBorrows', () => {
  it.each([
    [45, 23, 0],
    [30, 12, 1],
    [300, 12, 2],
    [1000, 1, 3],
    [50000, 1, 4],
  ])('countBorrows(%i, %i) = %i', (a, b, expected) => {
    expect(countBorrows(a, b)).toBe(expected);
  });
});
