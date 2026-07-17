// Test-only build flag. Set exclusively by `.env.e2e` (vite --mode e2e).
// A normal production build leaves VITE_E2E unset, so everything guarded by
// E2E_ENABLED is dead-code-eliminated and never ships to real users.
export const E2E_ENABLED = import.meta.env.VITE_E2E === '1';

// Under e2e, collapse feedback/advance delays so the suite is fast and stable.
export function feedbackDelay(ms: number): number {
  return E2E_ENABLED ? 30 : ms;
}
