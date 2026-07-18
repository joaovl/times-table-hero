import { tokenStore, kidTokenStore, currentKid } from '@/lib/api/client';
import { getLink } from './kidLink';
import { enqueue, flush } from './outbox';

export interface PracticeRecord {
  module: string;
  correct: number;
  total: number;
  durationSec: number;
  topics: string[];
  startedAt: string;
  endedAt: string;
}

/**
 * Log a completed practice session for a device-local profile — but only when
 * that profile is linked to a cloud kid AND a parent is signed in on the
 * device. Otherwise it's a no-op, preserving the account-free experience.
 */
export function recordPractice(localProfileId: string | undefined, r: PracticeRecord): void {
  // Preferred (Phase 3): a kid signed in on a paired device logs straight to
  // their own cloud record via the kid session token — no manual link needed.
  const kid = currentKid();
  if (kid && kidTokenStore.get()) {
    enqueue({ id: crypto.randomUUID(), kidId: kid.id, ...r });
    void flush();
    return;
  }
  // Legacy: a device-local profile manually linked to a cloud kid, with a parent
  // signed in on the device. Otherwise a no-op (account-free play).
  if (!localProfileId) return;
  const kidId = getLink(localProfileId);
  if (!kidId || !tokenStore.get()) return;
  enqueue({ id: crypto.randomUUID(), kidId, ...r });
  void flush();
}
