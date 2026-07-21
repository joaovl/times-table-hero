import { describe, it, expect } from 'vitest';
import { fractionsOracle } from './oracle';
import type { FractionQuestion } from './logic';

const q: FractionQuestion = {
  skill: 'add-diff',
  a: { num: 1, den: 2 }, b: { num: 1, den: 8 },
  answer: { num: 5, den: 8 },
} as FractionQuestion;

describe('fractionsOracle', () => {
  it('reports the canonical answer as num/den and typed input', () => {
    const o = fractionsOracle(q);
    expect(o.expected).toBe('5/8');
    expect(o.inputMode).toBe('typed');
    expect(o.highlightCount).toBe(0);
  });
  it('gives a stable questionId that differs for different questions', () => {
    const q2 = { ...q, a: { num: 1, den: 4 } } as FractionQuestion;
    expect(fractionsOracle(q).questionId).not.toBe(fractionsOracle(q2).questionId);
  });
});
