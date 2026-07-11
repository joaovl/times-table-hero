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

  const balanceCfg = (over: Record<string, unknown> = {}) => ({
    level1: {
      mode: 'balance',
      goal: { minutes: 20 },
      score: { kind: 'dailyPercent', minPercent: 50 },
      balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1, ...over },
    },
    level2: { successDaysRequired: 5, weeklyReward: 'x' },
    level3: { enabled: false, target: '2weeks', reward: 'x' },
  });

  it('accepts balance mode', () => {
    expect(parseRewardRules(balanceCfg())).not.toBeNull();
  });

  it('rejects balance mode with a negative rate', () => {
    expect(parseRewardRules(balanceCfg({ minutesPerUnit: -1 }))).toBeNull();
  });

  it('rejects balance mode with an empty unit label', () => {
    expect(parseRewardRules(balanceCfg({ unitLabel: '' }))).toBeNull();
  });

  it('rejects balance mode missing the balance block', () => {
    const cfg = balanceCfg();
    delete (cfg.level1 as Record<string, unknown>).balance;
    expect(parseRewardRules(cfg)).toBeNull();
  });

  it('still accepts a fixed rule with no explicit mode', () => {
    expect(parseRewardRules(valid)).toEqual(valid); // `valid` has no `mode`
  });
});
