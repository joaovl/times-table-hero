import type { RewardRulesConfig } from '@/lib/rewards-types';

// Client-side pre-flight for the reward-rules save. Returns a human message when
// the config would be rejected by the server for a reason the parent can't
// otherwise see, or null when it's safe to send. Currently guards the one field
// the server hard-requires but the form lets you clear: the balance unit label.
export function preflightRulesError(config: RewardRulesConfig): string | null {
  if (config.daily.mode === 'balance' && !(config.daily.balance?.unitLabel ?? '').trim()) {
    return 'Please enter a reward unit (e.g. "hours of TV") before saving.';
  }
  return null;
}

// Map a failed save to an actionable message. Previously every failure showed a
// single opaque "Could not save.", which is what a parent hit in bug #5.
export function saveErrorMessage(status: number | undefined): string {
  switch (status) {
    case 401:
      return 'Your session expired — please sign in again, then save.';
    case 404:
      return 'That child was not found — reload the page and try again.';
    case 400:
      return 'Some reward settings look incomplete — check the goal, reward unit and reward fields.';
    default:
      return 'Could not save. Please check your connection and try again.';
  }
}
