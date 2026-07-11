import { describe, it, expect } from 'vitest';
import { parseRewardRules } from './validate';

const valid = {
  level1: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '1 pound' },
  level2: { successDaysRequired: 5, weeklyReward: '10 pounds' },
  level3: { enabled: true, target: '2weeks', reward: 'shoes' },
};

describe('parseRewardRules', () => {
  it('accepts a well-formed config', () => {
    expect(parseRewardRules(valid)).toEqual(valid);
  });

  it('accepts lastNAverage score and month target', () => {
    const cfg = { ...valid, level1: { ...valid.level1, score: { kind: 'lastNAverage', n: 2, minPercent: 100 } }, level3: { enabled: false, target: 'month', reward: 'x' } };
    expect(parseRewardRules(cfg)).not.toBeNull();
  });

  it('rejects a missing level', () => {
    const { level3, ...rest } = valid;
    void level3;
    expect(parseRewardRules(rest)).toBeNull();
  });

  it('rejects an empty goal (no goal fields set)', () => {
    expect(parseRewardRules({ ...valid, level1: { ...valid.level1, goal: {} } })).toBeNull();
  });

  it('rejects a bad score kind', () => {
    expect(parseRewardRules({ ...valid, level1: { ...valid.level1, score: { kind: 'nope', minPercent: 80 } } })).toBeNull();
  });

  it('rejects a bad level3 target', () => {
    expect(parseRewardRules({ ...valid, level3: { enabled: true, target: 'year', reward: 'x' } })).toBeNull();
  });

  it('rejects non-objects', () => {
    expect(parseRewardRules(null)).toBeNull();
    expect(parseRewardRules('x')).toBeNull();
  });
});
