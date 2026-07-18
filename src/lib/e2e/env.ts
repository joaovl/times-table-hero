// Test-only build flag. Set exclusively by `.env.e2e` (vite --mode e2e).
// A normal production build leaves VITE_E2E unset, so everything guarded by
// E2E_ENABLED is dead-code-eliminated and never ships to real users.
export const E2E_ENABLED = import.meta.env.VITE_E2E === '1';

// Under e2e, collapse feedback/advance delays so the suite is fast and stable.
// A spec that must assert on transient feedback text (or a headed demo run)
// can widen the window at runtime via sessionStorage 'tth-e2e-feedback-ms';
// the knob only exists in e2e builds, so real users are unaffected.
export function feedbackDelay(ms: number): number {
  if (!E2E_ENABLED) return ms;
  try {
    const v = Number(sessionStorage.getItem('tth-e2e-feedback-ms'));
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    // sessionStorage unavailable (SSR/sandbox) — fall through
  }
  return 30;
}
