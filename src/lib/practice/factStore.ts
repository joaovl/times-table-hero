// Per-profile persistence for the adaptive fact engine. Stored on-device in
// localStorage keyed by the local player id — never sent anywhere.
import type { FactStore } from './factModel';

const keyFor = (profileId: string) => `tth_fact_stats:${profileId}`;

export function loadFactStore(profileId: string | undefined): FactStore {
  if (!profileId) return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(profileId)) ?? '{}') as FactStore;
  } catch {
    return {};
  }
}

export function saveFactStore(profileId: string | undefined, store: FactStore): void {
  if (!profileId) return;
  try {
    localStorage.setItem(keyFor(profileId), JSON.stringify(store));
  } catch {
    /* quota / private mode — adaptivity silently degrades to uniform */
  }
}
