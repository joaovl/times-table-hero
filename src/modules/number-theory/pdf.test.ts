import { describe, it, expect, beforeEach, vi } from 'vitest';

const { capturedTextCalls, capturedLines } = vi.hoisted(() => ({
  capturedTextCalls: [] as string[],
  capturedLines: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
}));

vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setLineWidth() {}
    setDrawColor() {}
    setFillColor() {}
    line(x1: number, y1: number, x2: number, y2: number) {
      capturedLines.push({ x1, y1, x2, y2 });
    }
    circle() {}
    addPage() {}
    save() {}
    output() {
      return '';
    }
    getTextWidth(s: string) {
      return s.length * 2;
    }
    text(text: unknown) {
      if (typeof text === 'string') capturedTextCalls.push(text);
      else if (Array.isArray(text)) {
        for (const t of text) if (typeof t === 'string') capturedTextCalls.push(t);
      }
    }
  }
  return { default: FakeJsPDF };
});

import { generateNumberTheoryPdf } from './pdf';
import {
  generateNumberTheoryQuestions,
  NUMBER_THEORY_SKILL_OPTIONS,
} from './logic';
import type { NumberTheoryQuestion, NumberTheorySettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
  capturedLines.length = 0;
});

const render = (qs: NumberTheoryQuestion[]) =>
  generateNumberTheoryPdf({ pages: [qs], title: 'Test', subtitle: '' });

// Unicode Math Operators block (U+2200..U+22FF). No char in this block is
// in Helvetica's WinAnsi encoding — would mis-render in jsPDF.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

// Convenience constructors for each skill.
const factors = (n: number, answer: number[]): NumberTheoryQuestion => ({
  skill: 'factors',
  n,
  answer,
});
const multiples = (
  base: number,
  count: number,
  answer: number[]
): NumberTheoryQuestion => ({ skill: 'multiples', base, count, answer });
const factorPair = (n: number, m: number): NumberTheoryQuestion => ({
  skill: 'factor-pair',
  n,
  m,
  answer: n % m === 0,
});
const isMultiple = (n: number, m: number): NumberTheoryQuestion => ({
  skill: 'is-multiple',
  n,
  m,
  answer: n % m === 0,
});
const primeRecognize = (n: number, ans: boolean): NumberTheoryQuestion => ({
  skill: 'prime-recognize',
  n,
  answer: ans,
});
const primeList = (
  cands: number[],
  ans: number[]
): NumberTheoryQuestion => ({
  skill: 'prime-list-19',
  candidates: cands,
  answer: ans,
});
const square = (base: number): NumberTheoryQuestion => ({
  skill: 'square',
  base,
  answer: base * base,
});
const cube = (base: number): NumberTheoryQuestion => ({
  skill: 'cube',
  base,
  answer: base * base * base,
});
const sqrt = (radicand: number, root: number): NumberTheoryQuestion => ({
  skill: 'square-root',
  base: radicand,
  answer: root,
});
const commonFactor = (n: number, m: number, ans: number[]): NumberTheoryQuestion => ({
  skill: 'common-factor',
  n,
  m,
  answer: ans,
});

describe('generateNumberTheoryPdf — question numbering', () => {
  it('renders "1." for a single question', () => {
    render([square(5)]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('numbers continue across multiple pages (single-answer layout)', () => {
    generateNumberTheoryPdf({
      pages: [[square(2)], [square(3)]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });

  it('list-layout prompt cells start with "N." prefix', () => {
    render([factors(24, [1, 2, 3, 4, 6, 8, 12, 24])]);
    // The list path emits "1. List the factors of 24:" as a single text call.
    const found = capturedTextCalls.some(t => t.startsWith('1. '));
    expect(found).toBe(true);
  });
});

describe('generateNumberTheoryPdf — prompts per skill', () => {
  it('factors uses "List the factors of N:"', () => {
    render([factors(24, [1, 2, 3, 4, 6, 8, 12, 24])]);
    expect(capturedTextCalls.some(t => t.includes('List the factors of 24'))).toBe(
      true
    );
  });

  it('multiples uses "First N multiples of M:"', () => {
    render([multiples(7, 5, [7, 14, 21, 28, 35])]);
    expect(
      capturedTextCalls.some(t => t.includes('First 5 multiples of 7'))
    ).toBe(true);
  });

  it('common-factor mentions both numbers', () => {
    render([commonFactor(12, 18, [1, 2, 3, 6])]);
    expect(
      capturedTextCalls.some(t => t.includes('Common factors of 12 and 18'))
    ).toBe(true);
  });

  it('factor-pair / is-multiple / prime-recognize use yes/no phrasing', () => {
    render([factorPair(24, 6), isMultiple(35, 5), primeRecognize(13, true)]);
    expect(
      capturedTextCalls.some(t => t.includes('Is 6 a factor of 24'))
    ).toBe(true);
    expect(
      capturedTextCalls.some(t => t.includes('Is 35 a multiple of 5'))
    ).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('Is 13 prime'))).toBe(true);
  });

  it('prime-list-19 inlines the candidate list with "Circle the primes"', () => {
    render([primeList([15, 17, 18, 19, 21], [17, 19])]);
    expect(
      capturedTextCalls.some(
        t =>
          t.includes('Circle the primes') &&
          t.includes('15') &&
          t.includes('17') &&
          t.includes('19') &&
          t.includes('21')
      )
    ).toBe(true);
  });

  it('square renders the base and a "2" superscript', () => {
    render([square(5)]);
    expect(capturedTextCalls).toContain('5');
    expect(capturedTextCalls).toContain('2');
    expect(capturedTextCalls).toContain(' =');
  });

  it('cube renders the base and a "3" superscript', () => {
    render([cube(3)]);
    expect(capturedTextCalls).toContain('3');
    // Both base "3" and superscript "3" appear; check the equals sign and ensure
    // the standalone "3" is present at least twice in the stream.
    expect(capturedTextCalls.filter(s => s === '3').length).toBeGreaterThanOrEqual(2);
    expect(capturedTextCalls).toContain(' =');
  });

  it('square-root renders the radicand text and uses radical line primitives (no √ glyph)', () => {
    render([sqrt(49, 7)]);
    expect(capturedTextCalls).toContain('49');
    expect(capturedTextCalls).toContain(' =');
    // No √ glyph anywhere in the text stream.
    capturedTextCalls.forEach(t => expect(t).not.toMatch(/√/));
    // The radical primitive emits at least 3 line() calls (tick, diagonal,
    // overbar) on top of page chrome.
    expect(capturedLines.length).toBeGreaterThanOrEqual(3);
  });
});

describe('generateNumberTheoryPdf — answer key', () => {
  it('omits answers when includeAnswerKey is unset', () => {
    render([square(5)]);
    expect(capturedTextCalls).not.toContain('1) 25');
  });

  it('renders single-number answers verbatim', () => {
    generateNumberTheoryPdf({
      pages: [[square(5), cube(3), sqrt(49, 7)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 25');
    expect(capturedTextCalls).toContain('2) 27');
    expect(capturedTextCalls).toContain('3) 7');
  });

  it('renders list answers as comma-joined', () => {
    generateNumberTheoryPdf({
      pages: [[factors(24, [1, 2, 3, 4, 6, 8, 12, 24])]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 1, 2, 3, 4, 6, 8, 12, 24');
  });

  it('renders boolean answers as yes/no', () => {
    generateNumberTheoryPdf({
      pages: [[primeRecognize(13, true), primeRecognize(15, false)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) yes');
    expect(capturedTextCalls).toContain('2) no');
  });

  it('numbering continues across pages in the answer key', () => {
    generateNumberTheoryPdf({
      pages: [[square(2), square(3)], [square(4)]],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 4');
    expect(capturedTextCalls).toContain('2) 9');
    expect(capturedTextCalls).toContain('3) 16');
    expect(capturedTextCalls).toContain('Maths — Answer Key');
  });
});

describe('generateNumberTheoryPdf — encoding safety', () => {
  it('no Math Operators block chars in a mixed single-answer page', () => {
    render([
      square(5),
      cube(3),
      sqrt(49, 7),
      factorPair(24, 6),
      isMultiple(35, 5),
      primeRecognize(13, true),
    ]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars in a list-answer page', () => {
    render([
      factors(24, [1, 2, 3, 4, 6, 8, 12, 24]),
      multiples(7, 5, [7, 14, 21, 28, 35]),
      commonFactor(12, 18, [1, 2, 3, 6]),
      primeList([15, 17, 18, 19, 21], [17, 19]),
    ]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across full grid + answer key, every skill', () => {
    const settings: NumberTheorySettings = {
      skills: [...NUMBER_THEORY_SKILL_OPTIONS],
      difficulty: 'medium',
      gameMode: 'questions',
      questionCount: 30,
      timeLimit: 0,
    };
    const qs = generateNumberTheoryQuestions(settings, 30);
    generateNumberTheoryPdf({
      pages: [qs],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no √ glyph ever appears in PDF text (square-root uses radical primitive)', () => {
    const settings: NumberTheorySettings = {
      skills: ['square-root'],
      difficulty: 'hard',
      gameMode: 'questions',
      questionCount: 20,
      timeLimit: 0,
    };
    const qs = generateNumberTheoryQuestions(settings, 20);
    generateNumberTheoryPdf({
      pages: [qs],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(t).not.toMatch(/√/);
    });
  });
});

describe('generateNumberTheoryPdf — round-trip with generator', () => {
  it('every generated factors question shows up in the answer key', () => {
    const settings: NumberTheorySettings = {
      skills: ['factors'],
      difficulty: 'medium',
      gameMode: 'questions',
      questionCount: 10,
      timeLimit: 0,
    };
    const qs = generateNumberTheoryQuestions(settings, 10);
    generateNumberTheoryPdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    qs.forEach((q, i) => {
      if (q.skill === 'factors') {
        expect(capturedTextCalls).toContain(`${i + 1}) ${q.answer.join(', ')}`);
      }
    });
  });
});
