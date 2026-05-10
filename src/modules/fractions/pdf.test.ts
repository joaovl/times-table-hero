import { describe, it, expect, beforeEach, vi } from 'vitest';

const { capturedTextCalls } = vi.hoisted(() => ({
  capturedTextCalls: [] as string[],
}));

vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setLineWidth() {}
    setDrawColor() {}
    setFillColor() {}
    line() {}
    circle() {}
    rect() {}
    triangle() {}
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

import { generateFractionsPdf } from './pdf';
import type { FractionQuestion } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: FractionQuestion[], opts?: { includeAnswerKey?: boolean }) =>
  generateFractionsPdf({
    pages: [qs],
    title: 'Test',
    subtitle: '',
    includeAnswerKey: opts?.includeAnswerKey,
  });

// Mathematical Operators block (U+2200..U+22FF) — Helvetica's WinAnsi
// encoding cannot render any char in this block, so anything passed to
// doc.text() must avoid it. We also forbid U+2212 explicitly (math-minus).
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateFractionsPdf — single question render', () => {
  it('renders both operand numerators and denominators as separate text calls', () => {
    render([
      {
        skill: 'add-same',
        a: { num: 1, den: 4 },
        b: { num: 2, den: 4 },
        answer: { num: 3, den: 4 },
      },
    ]);
    // Numerators
    expect(capturedTextCalls).toContain('1');
    expect(capturedTextCalls).toContain('2');
    // Denominators (4 appears twice; toContain is satisfied by either)
    expect(capturedTextCalls).toContain('4');
  });

  it('prefixes the question with its 1-based number', () => {
    render([
      {
        skill: 'add-same',
        a: { num: 1, den: 4 },
        b: { num: 2, den: 4 },
        answer: { num: 3, den: 4 },
      },
    ]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('emits the operator glyph (+ for add)', () => {
    render([
      {
        skill: 'add-same',
        a: { num: 1, den: 4 },
        b: { num: 2, den: 4 },
        answer: { num: 3, den: 4 },
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('+'))).toBe(true);
  });

  it('subtract questions emit ASCII hyphen-minus, never U+2212', () => {
    render([
      {
        skill: 'sub-same',
        a: { num: 3, den: 4 },
        b: { num: 1, den: 4 },
        answer: { num: 1, den: 2 },
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('-'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('−'))).toBe(false);
  });

  it('emits an equals sign', () => {
    render([
      {
        skill: 'add-same',
        a: { num: 1, den: 4 },
        b: { num: 2, den: 4 },
        answer: { num: 3, den: 4 },
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('='))).toBe(true);
  });
});

describe('generateFractionsPdf — question numbering', () => {
  it('numbers continue across multiple pages', () => {
    capturedTextCalls.length = 0;
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'add-same',
            a: { num: 1, den: 3 },
            b: { num: 1, den: 3 },
            answer: { num: 2, den: 3 },
          },
        ],
        [
          {
            skill: 'add-same',
            a: { num: 1, den: 5 },
            b: { num: 2, den: 5 },
            answer: { num: 3, den: 5 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });
});

describe('generateFractionsPdf — answer key', () => {
  it('does not include answers when includeAnswerKey is unset', () => {
    render([
      {
        skill: 'add-same',
        a: { num: 1, den: 4 },
        b: { num: 2, den: 4 },
        answer: { num: 3, den: 4 },
      },
    ]);
    expect(capturedTextCalls.some(t => t === '1) 3/4')).toBe(false);
  });

  it('formats answer key entries as "n) num/den"', () => {
    render(
      [
        {
          skill: 'add-same',
          a: { num: 1, den: 4 },
          b: { num: 2, den: 4 },
          answer: { num: 3, den: 4 },
        },
        {
          skill: 'sub-same',
          a: { num: 3, den: 4 },
          b: { num: 1, den: 4 },
          answer: { num: 1, den: 2 },
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 3/4');
    expect(capturedTextCalls).toContain('2) 1/2');
    expect(capturedTextCalls).toContain('Test — Answer Key');
  });

  it('numbers answer key entries continuously across pages', () => {
    capturedTextCalls.length = 0;
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'add-same',
            a: { num: 1, den: 5 },
            b: { num: 2, den: 5 },
            answer: { num: 3, den: 5 },
          },
        ],
        [
          {
            skill: 'sub-same',
            a: { num: 4, den: 7 },
            b: { num: 1, den: 7 },
            answer: { num: 3, den: 7 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 3/5');
    expect(capturedTextCalls).toContain('2) 3/7');
  });
});

describe('generateFractionsPdf — encoding safety', () => {
  it('no Math Operators block chars in any text call', () => {
    render(
      [
        {
          skill: 'add-same',
          a: { num: 1, den: 4 },
          b: { num: 2, den: 4 },
          answer: { num: 3, den: 4 },
        },
        {
          skill: 'sub-same',
          a: { num: 5, den: 6 },
          b: { num: 1, den: 6 },
          answer: { num: 2, den: 3 },
        },
        {
          skill: 'add-diff',
          a: { num: 1, den: 2 },
          b: { num: 1, den: 3 },
          answer: { num: 5, den: 6 },
        },
        {
          skill: 'sub-diff',
          a: { num: 1, den: 2 },
          b: { num: 1, den: 4 },
          answer: { num: 1, den: 4 },
        },
      ],
      { includeAnswerKey: true }
    );
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}"`).toBe(false);
    });
  });

  it('subtract question never writes math-minus U+2212', () => {
    render([
      {
        skill: 'sub-diff',
        a: { num: 3, den: 4 },
        b: { num: 1, den: 6 },
        answer: { num: 7, den: 12 },
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('−'))).toBe(false);
  });
});

describe('generateFractionsPdf — does not leak answer into question area', () => {
  it("answer numerator/denominator combo does not appear as 'n/d' on the question page", () => {
    // The question prints num/den separately, never as a single n/d token —
    // the n/d token is reserved for the answer key.
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'add-same',
            a: { num: 1, den: 4 },
            b: { num: 2, den: 4 },
            answer: { num: 3, den: 4 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      // no includeAnswerKey
    });
    expect(capturedTextCalls.some(t => t === '3/4')).toBe(false);
  });
});

// ----- v2 skills (id / eq / cmp / mixed) --------------------------------

describe('generateFractionsPdf — id skill', () => {
  it('does not print the shaded/total fraction as text on the question page', () => {
    // The question shows the figure; the kid writes the answer in the blank.
    // We rely on the figure render (not text) to communicate the question.
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'id',
            figure: 'circle',
            total: 4,
            shaded: 3,
            answer: { num: 3, den: 4 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls.some(t => t === '3/4')).toBe(false);
  });

  it('emits the id answer in the answer key when requested', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'id',
            figure: 'rect',
            total: 6,
            shaded: 2,
            rows: 2,
            cols: 3,
            answer: { num: 2, den: 6 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 2/6');
  });
});

describe('generateFractionsPdf — eq skill', () => {
  it('renders source num/den and the visible target field', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'eq',
            source: { num: 1, den: 2 },
            target: { num: 3, den: 6 },
            missing: 'num',
            answer: 3,
          },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    // Source 1/2 must show; the visible denominator 6 must show; the hidden
    // numerator 3 must NOT be drawn on the question side.
    expect(capturedTextCalls).toContain('1');
    expect(capturedTextCalls).toContain('2');
    expect(capturedTextCalls).toContain('6');
    // 3 might also appear elsewhere (e.g. answer key) but it shouldn't be
    // standalone in the question text. The actual print of '3' would only
    // happen if drawFraction was called with frac.num=3 — drawFractionWithBlank
    // is supposed to draw a blank instead. Hard to assert "3 wasn't drawn"
    // without false positives, so we only check the visible side here.
  });

  it('emits the missing field as the answer-key value', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'eq',
            source: { num: 1, den: 2 },
            target: { num: 3, den: 6 },
            missing: 'num',
            answer: 3,
          },
          {
            skill: 'eq',
            source: { num: 2, den: 3 },
            target: { num: 4, den: 6 },
            missing: 'den',
            answer: 6,
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 3');
    expect(capturedTextCalls).toContain('2) 6');
  });
});

describe('generateFractionsPdf — cmp skill', () => {
  it('renders both fractions, no comparison symbol baked into the PDF', () => {
    generateFractionsPdf({
      pages: [
        [
          { skill: 'cmp', a: { num: 3, den: 4 }, b: { num: 5, den: 8 }, answer: '>' },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('3');
    expect(capturedTextCalls).toContain('4');
    expect(capturedTextCalls).toContain('5');
    expect(capturedTextCalls).toContain('8');
    // The comparison symbol is in an empty box for the kid to fill.
    expect(capturedTextCalls.some(t => t === '>')).toBe(false);
  });

  it('answer key prints the comparison symbol', () => {
    generateFractionsPdf({
      pages: [
        [
          { skill: 'cmp', a: { num: 3, den: 4 }, b: { num: 5, den: 8 }, answer: '>' },
          { skill: 'cmp', a: { num: 1, den: 2 }, b: { num: 2, den: 4 }, answer: '=' },
          { skill: 'cmp', a: { num: 1, den: 3 }, b: { num: 1, den: 2 }, answer: '<' },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) >');
    expect(capturedTextCalls).toContain('2) =');
    expect(capturedTextCalls).toContain('3) <');
  });
});

describe('generateFractionsPdf — mixed skill', () => {
  it('to-mixed direction shows the improper fraction in the question', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'mixed',
            direction: 'to-mixed',
            improper: { num: 7, den: 3 },
            mixed: { whole: 2, num: 1, den: 3 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('7');
    expect(capturedTextCalls).toContain('3');
  });

  it('to-improper direction shows the whole part and the fractional part', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'mixed',
            direction: 'to-improper',
            improper: { num: 7, den: 3 },
            mixed: { whole: 2, num: 1, den: 3 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
    });
    // whole 2 is rendered as a leading integer.
    expect(capturedTextCalls).toContain('2');
    expect(capturedTextCalls).toContain('1');
    expect(capturedTextCalls).toContain('3');
  });

  it('answer-key formats mixed-direction answers as "w n/d" (or "w" when proper part is 0)', () => {
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'mixed',
            direction: 'to-mixed',
            improper: { num: 7, den: 3 },
            mixed: { whole: 2, num: 1, den: 3 },
          },
          {
            skill: 'mixed',
            direction: 'to-improper',
            improper: { num: 7, den: 3 },
            mixed: { whole: 2, num: 1, den: 3 },
          },
          {
            skill: 'mixed',
            direction: 'to-mixed',
            improper: { num: 6, den: 3 },
            mixed: { whole: 2, num: 0, den: 3 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 2 1/3');
    expect(capturedTextCalls).toContain('2) 7/3');
    expect(capturedTextCalls).toContain('3) 2');
  });
});

describe('generateFractionsPdf — mixed-skill answer key encoding safety', () => {
  it('answer-key entries for all v2 skills use only ASCII and printable characters', () => {
    capturedTextCalls.length = 0;
    generateFractionsPdf({
      pages: [
        [
          {
            skill: 'id',
            figure: 'circle',
            total: 5,
            shaded: 2,
            answer: { num: 2, den: 5 },
          },
          {
            skill: 'eq',
            source: { num: 1, den: 4 },
            target: { num: 3, den: 12 },
            missing: 'num',
            answer: 3,
          },
          { skill: 'cmp', a: { num: 3, den: 4 }, b: { num: 5, den: 8 }, answer: '>' },
          {
            skill: 'mixed',
            direction: 'to-mixed',
            improper: { num: 11, den: 4 },
            mixed: { whole: 2, num: 3, den: 4 },
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(/[∀-⋿]/u.test(t), `unrenderable char in "${t}"`).toBe(false);
      expect(t.includes('−'), `math-minus in "${t}"`).toBe(false);
    });
  });
});
