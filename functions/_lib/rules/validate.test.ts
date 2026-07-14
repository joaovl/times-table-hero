import { describe, it, expect } from 'vitest';
import { parseRewardRules } from './validate';

const valid = {
  daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: '1 pound' },
  ladder: [{ threshold: 5, reward: '10 pounds' }],
  paused: false,
};

describe('parseRewardRules (v2: daily + ladder + paused)', () => {
  it('accepts a well-formed fixed config', () => {
    expect(parseRewardRules(valid)).toEqual(valid);
  });

  it('accepts a balance-mode daily rule', () => {
    const cfg = { ...valid, daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, mode: 'balance', balance: { unitLabel: 'hours of TV', minutesPerUnit: 20, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } } };
    expect(parseRewardRules(cfg)).not.toBeNull();
  });

  it('accepts a focus (targeted practice) list', () => {
    const cfg = { ...valid, daily: { ...valid.daily, focus: ['mult-8'] } };
    expect(parseRewardRules(cfg)).not.toBeNull();
  });

  it('accepts many ladder tiers (any number of jumps)', () => {
    const cfg = { ...valid, ladder: [{ threshold: 3, reward: 'a' }, { threshold: 7, reward: 'b' }, { threshold: 30, reward: 'c' }] };
    expect(parseRewardRules(cfg)?.ladder).toHaveLength(3);
  });

  it('accepts an empty ladder', () => {
    expect(parseRewardRules({ ...valid, ladder: [] })).not.toBeNull();
  });

  it('rejects a missing/invalid daily rule', () => {
    const { daily, ...rest } = valid; void daily;
    expect(parseRewardRules(rest)).toBeNull();
    expect(parseRewardRules({ ...valid, daily: { goal: {}, score: valid.daily.score, mode: 'fixed', dailyReward: 'x' } })).toBeNull();
  });

  it('rejects a bad ladder (non-array or a tier missing its reward / bad threshold)', () => {
    expect(parseRewardRules({ ...valid, ladder: 'nope' })).toBeNull();
    expect(parseRewardRules({ ...valid, ladder: [{ threshold: 5 }] })).toBeNull();
    expect(parseRewardRules({ ...valid, ladder: [{ threshold: 0, reward: 'x' }] })).toBeNull();
  });

  it('rejects a non-boolean paused', () => {
    expect(parseRewardRules({ ...valid, paused: 'yes' })).toBeNull();
  });

  it('rejects balance mode with a negative rate', () => {
    const cfg = { ...valid, daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 50 }, mode: 'balance', balance: { unitLabel: 'x', minutesPerUnit: -1, exercisesPerUnit: 10, rewardPerUnit: 1, penaltyPerMissedDay: 1 } } };
    expect(parseRewardRules(cfg)).toBeNull();
  });

  it('rejects non-objects', () => {
    expect(parseRewardRules(null)).toBeNull();
    expect(parseRewardRules('x')).toBeNull();
  });
});
