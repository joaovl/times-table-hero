import { describe, it, expect } from 'vitest';
import { E2E_ENABLED, feedbackDelay } from './env';

describe('e2e env gate', () => {
  it('is disabled by default (unit/dev/prod, VITE_E2E unset)', () => {
    expect(E2E_ENABLED).toBe(false);
  });
  it('feedbackDelay returns the real delay when disabled', () => {
    expect(feedbackDelay(1400)).toBe(1400);
  });
  it('feedbackDelay ignores the e2e-only sessionStorage knob when disabled', () => {
    // In a non-e2e build the knob must have no effect even if set.
    globalThis.sessionStorage?.setItem?.('tth-e2e-feedback-ms', '9999');
    expect(feedbackDelay(1400)).toBe(1400);
  });
});
