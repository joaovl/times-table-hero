import { describe, it, expect } from 'vitest';
import { resolveEffective } from './effective';
import type { RulesRow } from './repo';
import type { RewardRulesConfig } from './types';

const config = (reward: string): RewardRulesConfig => ({
  level1: { mode: 'fixed', goal: { minutes: 20 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: reward },
  level2: { successDaysRequired: 5, weeklyReward: 'w' },
  level3: { enabled: false, target: '2weeks', reward: 'x' },
});
const row = (kidId: string | null, reward: string): RulesRow => ({ kidId, config: config(reward), updatedAt: 't' });

describe('resolveEffective', () => {
  it('prefers the per-kid rule over the all-kids rule', () => {
    const rows = [row(null, 'all'), row('k1', 'k1-only')];
    expect(resolveEffective(rows, 'k1')?.level1).toMatchObject({ dailyReward: 'k1-only' });
  });

  it('falls back to the all-kids rule', () => {
    expect(resolveEffective([row(null, 'all')], 'k1')?.level1).toMatchObject({ dailyReward: 'all' });
  });

  it('returns null when there is no applicable rule', () => {
    expect(resolveEffective([], 'k1')).toBeNull();
  });
});
