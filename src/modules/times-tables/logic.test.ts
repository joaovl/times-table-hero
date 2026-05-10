import { describe, it, expect } from 'vitest';
import { generateQuestions, generateWrongAnswers, shuffleOptions } from './logic';
import type { Question } from './logic';

const isMultiply = (q: Question) => q.kind === 'binary' && q.op === 'multiply';
const isDivide = (q: Question) => q.kind === 'binary' && q.op === 'divide';
const isSquare = (q: Question) => q.kind === 'unary' && q.op === 'square';
const isSqrt = (q: Question) => q.kind === 'unary' && q.op === 'sqrt';

describe('generateQuestions — multiply', () => {
  it('emits only binary multiply questions', () => {
    const qs = generateQuestions([5], 20, 'multiply');
    expect(qs).toHaveLength(20);
    qs.forEach(q => expect(isMultiply(q)).toBe(true));
  });

  it('answers respect a × b = a*b across 0..12', () => {
    for (let t = 0; t <= 12; t++) {
      const qs = generateQuestions([t], 13, 'multiply');
      for (let i = 0; i <= 12; i++) {
        const q = qs.find(x => x.kind === 'binary' && x.operand1 === t && x.operand2 === i);
        if (q && q.kind === 'binary') expect(q.answer).toBe(t * i);
      }
    }
  });
});

describe('generateQuestions — divide', () => {
  it('emits only binary divide questions and never divides by zero', () => {
    const qs = generateQuestions([0, 1, 2, 3], 100, 'divide');
    qs.forEach(q => {
      expect(isDivide(q)).toBe(true);
      if (q.kind === 'binary') expect(q.operand2).not.toBe(0);
    });
  });

  it('answers respect (t × i) ÷ t = i', () => {
    for (let t = 1; t <= 12; t++) {
      const qs = generateQuestions([t], 50, 'divide');
      for (let i = 0; i <= 12; i++) {
        const q = qs.find(x => x.kind === 'binary' && x.operand1 === t * i && x.operand2 === t);
        if (q && q.kind === 'binary') expect(q.answer).toBe(i);
      }
    }
  });
});

describe('generateQuestions — square', () => {
  it('emits only unary square questions', () => {
    const qs = generateQuestions([2, 5, 7], 30, 'square');
    expect(qs).toHaveLength(30);
    qs.forEach(q => expect(isSquare(q)).toBe(true));
  });

  it('answers respect n² = n*n for selected tables', () => {
    const qs = generateQuestions([3, 7, 12], 30, 'square');
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'square') {
        expect(q.answer).toBe(q.operand * q.operand);
        expect([3, 7, 12]).toContain(q.operand);
      }
    });
  });
});

describe('generateQuestions — sqrt', () => {
  it('emits only unary sqrt questions', () => {
    const qs = generateQuestions([2, 5, 7], 30, 'sqrt');
    expect(qs).toHaveLength(30);
    qs.forEach(q => expect(isSqrt(q)).toBe(true));
  });

  it('answers respect √(n²) = n for selected tables', () => {
    const qs = generateQuestions([3, 7, 12], 30, 'sqrt');
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'sqrt') {
        expect(q.operand).toBe(q.answer * q.answer);
        expect([3, 7, 12]).toContain(q.answer);
      }
    });
  });
});

describe('generateQuestions — all', () => {
  it('mixes all four operations across enough samples', () => {
    const qs = generateQuestions([2, 3, 4, 5, 6, 7, 8, 9, 10], 200, 'all');
    expect(qs.some(isMultiply)).toBe(true);
    expect(qs.some(isDivide)).toBe(true);
    expect(qs.some(isSquare)).toBe(true);
    expect(qs.some(isSqrt)).toBe(true);
  });
});

describe('generateQuestions — count and tables empty handling', () => {
  it('returns the requested count', () => {
    expect(generateQuestions([5, 7], 20, 'multiply')).toHaveLength(20);
    expect(generateQuestions([5, 7], 7, 'multiply')).toHaveLength(7);
  });
});

describe('generateWrongAnswers', () => {
  it('returns 2 wrong answers different from correct, all non-negative', () => {
    const wrong = generateWrongAnswers(20, 'easy');
    expect(wrong).toHaveLength(2);
    wrong.forEach(w => {
      expect(w).not.toBe(20);
      expect(w).toBeGreaterThanOrEqual(0);
    });
    expect(wrong[0]).not.toBe(wrong[1]);
  });

  it('medium answers stay close to correct', () => {
    const wrong = generateWrongAnswers(50, 'medium');
    expect(wrong).toHaveLength(2);
    wrong.forEach(w => expect(Math.abs(w - 50)).toBeLessThanOrEqual(10));
  });
});

describe('shuffleOptions', () => {
  it('returns three options containing the correct value', () => {
    const opts = shuffleOptions(42, [40, 44]);
    expect(opts).toHaveLength(3);
    expect(opts).toContain(42);
    expect(opts).toContain(40);
    expect(opts).toContain(44);
  });
});
