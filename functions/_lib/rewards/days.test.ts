import { describe, it, expect } from 'vitest';
import { localDayKey, groupByLocalDay } from './days';
import type { PracticeSession } from './types';

const mk = (startedAt: string): PracticeSession => ({
  kidId: 'k1', startedAt, durationSec: 60, module: 'times-tables',
  correct: 5, total: 5, topics: [],
});

describe('localDayKey', () => {
  it('uses UTC when offset is 0', () => {
    expect(localDayKey('2026-07-10T23:30:00Z', 0)).toBe('2026-07-10');
  });

  it('shifts across midnight for a positive (east) offset', () => {
    // +120 min → 01:30 next day local
    expect(localDayKey('2026-07-10T23:30:00Z', 120)).toBe('2026-07-11');
  });

  it('shifts back for a negative (west) offset', () => {
    // -300 min → 18:30 previous evening, still same date here
    expect(localDayKey('2026-07-10T01:30:00Z', -300)).toBe('2026-07-09');
  });
});

describe('groupByLocalDay', () => {
  it('buckets sessions into local-day keys', () => {
    const sessions = [mk('2026-07-10T10:00:00Z'), mk('2026-07-10T12:00:00Z'), mk('2026-07-11T09:00:00Z')];
    const g = groupByLocalDay(sessions, 0);
    expect(g.get('2026-07-10')?.length).toBe(2);
    expect(g.get('2026-07-11')?.length).toBe(1);
  });
});
