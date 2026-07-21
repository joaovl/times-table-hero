import { describe, it, expect } from 'vitest';
import { ALL_MODULES } from './registry';

describe('registry', () => {
  it('is an array (grows as adapters land)', () => {
    expect(Array.isArray(ALL_MODULES)).toBe(true);
  });
  it('every adapter exposes the contract surface', () => {
    for (const m of ALL_MODULES) {
      expect(typeof m.slug).toBe('string');
      expect(Array.isArray(m.skills)).toBe(true);
      expect(typeof m.settingsFor).toBe('function');
      expect(typeof m.generate).toBe('function');
      expect(typeof m.correctAnswer).toBe('function');
      expect(typeof m.isCorrect).toBe('function');
      expect(typeof m.choices).toBe('function');
    }
  });
});
