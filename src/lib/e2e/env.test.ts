import { describe, it, expect } from 'vitest';
import { E2E_ENABLED, feedbackDelay } from './env';

describe('e2e env gate', () => {
  it('is disabled by default (unit/dev/prod, VITE_E2E unset)', () => {
    expect(E2E_ENABLED).toBe(false);
  });
  it('feedbackDelay returns the real delay when disabled', () => {
    expect(feedbackDelay(1400)).toBe(1400);
  });
});
