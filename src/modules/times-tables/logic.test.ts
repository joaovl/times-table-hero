import { describe, it, expect } from 'vitest';
import { generateQuestions, factChoices } from './logic';
import { NONE_OF_THESE, isChoiceCorrect } from '@/lib/game/choices';
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

  it('balances operations evenly when count is divisible by 4', () => {
    const qs = generateQuestions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 100, 'all');
    expect(qs).toHaveLength(100);
    expect(qs.filter(isMultiply)).toHaveLength(25);
    expect(qs.filter(isDivide)).toHaveLength(25);
    expect(qs.filter(isSquare)).toHaveLength(25);
    expect(qs.filter(isSqrt)).toHaveLength(25);
  });

  it('distributes remainder to first ops when count is not divisible', () => {
    const qs = generateQuestions([1, 2, 3, 4], 10, 'all');
    expect(qs).toHaveLength(10);
    // 10 / 4 = 2 each, remainder 2 → 3, 3, 2, 2
    expect(qs.filter(isMultiply)).toHaveLength(3);
    expect(qs.filter(isDivide)).toHaveLength(3);
    expect(qs.filter(isSquare)).toHaveLength(2);
    expect(qs.filter(isSqrt)).toHaveLength(2);
  });
});

describe('generateQuestions — count and tables empty handling', () => {
  it('returns the requested count', () => {
    expect(generateQuestions([5, 7], 20, 'multiply')).toHaveLength(20);
    expect(generateQuestions([5, 7], 7, 'multiply')).toHaveLength(7);
  });
});

describe('factChoices', () => {
  const isWrong = (answer: number) => (c: string) => Number(c) !== answer;

  it('easy: three numeric options including the correct answer, no None button', () => {
    const opts = factChoices(20, 'easy');
    expect(opts).toHaveLength(3);
    expect(opts).toContain('20');
    expect(opts).not.toContain(NONE_OF_THESE);
    expect(opts.filter(o => isChoiceCorrect(o, opts, isWrong(20))).length).toBe(1);
  });

  it('medium (shown): includes the correct answer plus a None button', () => {
    const opts = factChoices(50, 'medium', false);
    expect(opts).toContain('50');
    expect(opts).toContain(NONE_OF_THESE);
    expect(isChoiceCorrect('50', opts, isWrong(50))).toBe(true);
    expect(isChoiceCorrect(NONE_OF_THESE, opts, isWrong(50))).toBe(false);
  });

  it('medium (hidden): omits the answer so None of these is correct', () => {
    const opts = factChoices(50, 'medium', true);
    expect(opts).not.toContain('50');
    expect(opts).toContain(NONE_OF_THESE);
    expect(isChoiceCorrect(NONE_OF_THESE, opts, isWrong(50))).toBe(true);
  });
});
