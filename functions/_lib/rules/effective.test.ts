import { describe, it, expect } from 'vitest';
import { resolveEffective } from './effective';
import type { RulesRow } from './repo';
import type { RewardRulesConfig } from './types';

const config = (reward: string): RewardRulesConfig => ({
  daily: { goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, mode: 'fixed', dailyReward: reward },
  ladder: [{ threshold: 5, reward: 'weekly' }],
  paused: false,
});
const row = (kidId: string | null, reward: string): RulesRow => ({ kidId, config: config(reward), updatedAt: 't' });

describe('resolveEffective', () => {
  it('prefers the per-kid rule over the all-kids rule', () => {
    const rows = [row(null, 'all'), row('k1', 'k1-only')];
    expect(resolveEffective(rows, 'k1')?.daily).toMatchObject({ dailyReward: 'k1-only' });
  });

  it('falls back to the all-kids rule', () => {
    expect(resolveEffective([row(null, 'all')], 'k1')?.daily).toMatchObject({ dailyReward: 'all' });
  });

  it('returns null when there is no applicable rule', () => {
    expect(resolveEffective([], 'k1')).toBeNull();
  });
});
