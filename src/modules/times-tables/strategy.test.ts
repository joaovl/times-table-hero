import { describe, it, expect } from 'vitest';
import { strategyFor, arrayDims } from './strategy';
import type { Question } from './logic';

describe('strategyFor', () => {
  it('returns a non-empty tip for every multiplication and division fact 0..12', () => {
    for (let a = 0; a <= 12; a++) {
      for (let b = 0; b <= 12; b++) {
        const mul: Question = { kind: 'binary', op: 'multiply', operand1: a, operand2: b, answer: a * b };
        expect(strategyFor(mul).length).toBeGreaterThan(0);
        if (b !== 0) {
          const div: Question = { kind: 'binary', op: 'divide', operand1: a * b, operand2: b, answer: a };
          expect(strategyFor(div)).toContain(String(a * b));
        }
      }
    }
  });

  it('describes squares and roots', () => {
    expect(strategyFor({ kind: 'unary', op: 'square', operand: 7, answer: 49 })).toContain('49');
    expect(strategyFor({ kind: 'unary', op: 'sqrt', operand: 49, answer: 7 })).toContain('7');
  });
});

describe('arrayDims', () => {
  it('gives rows×cols for a small product and null for out-of-range', () => {
    expect(arrayDims({ kind: 'binary', op: 'multiply', operand1: 7, operand2: 8, answer: 56 }))
      .toEqual({ rows: 7, cols: 8 });
    expect(arrayDims({ kind: 'binary', op: 'divide', operand1: 56, operand2: 8, answer: 7 })).toBeNull();
    expect(arrayDims({ kind: 'unary', op: 'square', operand: 6, answer: 36 })).toEqual({ rows: 6, cols: 6 });
  });
});
