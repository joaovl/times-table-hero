import { describe, it, expect } from 'vitest';
import { mondayOf, isoWeekKey, dayKeysFrom } from './weeks';

describe('mondayOf', () => {
  it('returns the same day for a Monday', () => {
    expect(mondayOf('2026-07-06')).toBe('2026-07-06'); // 2026-07-06 is a Monday
  });
  it('returns Monday for a Sunday', () => {
    expect(mondayOf('2026-07-12')).toBe('2026-07-06'); // Sunday → prior Monday
  });
});

describe('isoWeekKey', () => {
  it('formats an ISO week', () => {
    expect(isoWeekKey('2026-07-10')).toBe('2026-W28');
  });
});

describe('dayKeysFrom', () => {
  it('lists inclusive day keys', () => {
    expect(dayKeysFrom('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11', '2026-07-12']);
  });
});
