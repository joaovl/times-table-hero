import { describe, it, expect } from 'vitest';
import { generateQuestions, factKey } from './logic';
import { recordFactAttempt, weightFor, type FactStore } from '@/lib/practice/factModel';

const NOW = 1_700_000_000_000;

// End-to-end proof that the adaptive weighting reaches question generation: a
// single weak fact should be practised far more often than its 1/N uniform
// share once every other fact in the pool is mastered.
describe('adaptive question generation', () => {
  it('over-samples a weak fact relative to mastered ones', () => {
    const tables = [2, 3, 4];
    let store: FactStore = {};
    for (const t of tables) {
      for (let i = 0; i <= 12; i++) {
        const key = factKey({ kind: 'binary', op: 'multiply', operand1: t, operand2: i, answer: t * i });
        store = recordFactAttempt(store, key, true, 1200, NOW);
        store = recordFactAttempt(store, key, true, 1200, NOW);
      }
    }
    // Now make 4×9 a weak, slow fact.
    const weakKey = factKey({ kind: 'binary', op: 'multiply', operand1: 4, operand2: 9, answer: 36 });
    store = recordFactAttempt(store, weakKey, false, 5000, NOW);
    store = recordFactAttempt(store, weakKey, false, 5000, NOW);

    const qs = generateQuestions(tables, 300, 'multiply', q => weightFor(store[factKey(q)], NOW));
    const weakShare = qs.filter(q => factKey(q) === weakKey).length / qs.length;

    // Uniform share would be ~1/39 ≈ 2.6%; adaptive should be far higher.
    expect(weakShare).toBeGreaterThan(0.15);
  });

  it('is unchanged (uniform) when no weight function is passed', () => {
    const qs = generateQuestions([5], 100, 'multiply');
    expect(qs).toHaveLength(100);
    expect(qs.every(q => q.kind === 'binary')).toBe(true);
  });
});
