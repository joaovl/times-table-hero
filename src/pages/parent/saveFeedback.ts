import type { RewardRulesConfig } from '@/lib/rewards-types';
import { t } from '@/lib/i18n/i18n';

// Client-side pre-flight for the reward-rules save. Returns a human message when
// the config would be rejected by the server for a reason the parent can't
// otherwise see, or null when it's safe to send. Currently guards the one field
// the server hard-requires but the form lets you clear: the balance unit label.
export function preflightRulesError(config: RewardRulesConfig): string | null {
  if (config.daily.mode === 'balance' && !(config.daily.balance?.unitLabel ?? '').trim()) {
    return t('parent.rewards.save.unitRequired');
  }
  return null;
}

// Map a failed save to an actionable message. Previously every failure showed a
// single opaque "Could not save.", which is what a parent hit in bug #5.
export function saveErrorMessage(status: number | undefined): string {
  switch (status) {
    case 401:
      return t('parent.rewards.save.sessionExpired');
    case 404:
      return t('parent.rewards.save.childNotFound');
    case 400:
      return t('parent.rewards.save.incomplete');
    default:
      return t('parent.rewards.save.generic');
  }
}
