import { describe, it, expect } from 'vitest';
import { preflightRulesError, saveErrorMessage } from './saveFeedback';
import { DEFAULT_RULES, DEFAULT_BALANCE, type RewardRulesConfig } from '@/lib/rewards-types';

describe('preflightRulesError (bug #5)', () => {
  it('passes a valid fixed-reward config', () => {
    expect(preflightRulesError(DEFAULT_RULES)).toBeNull();
  });

  it('passes a balance config with a unit label', () => {
    const cfg: RewardRulesConfig = {
      ...DEFAULT_RULES,
      daily: { ...DEFAULT_RULES.daily, mode: 'balance', balance: { ...DEFAULT_BALANCE } },
    };
    expect(preflightRulesError(cfg)).toBeNull();
  });

  it('flags a balance config whose unit label is blank (server would reject silently)', () => {
    const cfg: RewardRulesConfig = {
      ...DEFAULT_RULES,
      daily: { ...DEFAULT_RULES.daily, mode: 'balance', balance: { ...DEFAULT_BALANCE, unitLabel: '   ' } },
    };
    expect(preflightRulesError(cfg)).toMatch(/reward unit/i);
  });
});

describe('saveErrorMessage (bug #5 — actionable messages)', () => {
  it('tells the parent to sign in again on 401', () => {
    expect(saveErrorMessage(401)).toMatch(/sign in/i);
  });
  it('mentions the child on 404', () => {
    expect(saveErrorMessage(404)).toMatch(/child/i);
  });
  it('points at incomplete settings on 400', () => {
    expect(saveErrorMessage(400)).toMatch(/incomplete|settings/i);
  });
  it('falls back for unknown/network errors', () => {
    expect(saveErrorMessage(undefined)).toMatch(/could not save/i);
  });
});
