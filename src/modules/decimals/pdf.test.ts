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

import { generateDecimalsPdf } from './pdf';
import type { DecimalsQuestion } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: DecimalsQuestion[], opts?: { includeAnswerKey?: boolean }) =>
  generateDecimalsPdf({
    pages: [qs],
    title: 'Test',
    subtitle: '',
    includeAnswerKey: opts?.includeAnswerKey,
  });

// Mathematical Operators block (U+2200..U+22FF) — Helvetica's WinAnsi
// encoding cannot render any char in this block. Anything passed to
// doc.text() must avoid it. Also forbid the standalone math-minus U+2212.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateDecimalsPdf — identify skill', () => {
  it('renders the decimal in the question stem', () => {
    render([
      {
        skill: 'identify-tenths',
        decimal: 0.3,
        answerNum: 3,
        answerDen: 10,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('0.3'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('as a fraction'))).toBe(true);
  });

  it('answer key formats identify answers as "n) num/den"', () => {
    render(
      [
        {
          skill: 'identify-hundredths',
          decimal: 0.45,
          answerNum: 45,
          answerDen: 100,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 45/100');
  });
});

describe('generateDecimalsPdf — round skill', () => {
  it('renders "Round X to nearest whole number" stem', () => {
    render([
      {
        skill: 'round-1dp',
        decimal: 3.7,
        precision: 0,
        answer: 4,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('Round'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('3.7'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('whole'))).toBe(true);
  });

  it('round-2dp at precision 1 mentions "1 dp" in the stem', () => {
    render([
      {
        skill: 'round-2dp',
        decimal: 3.45,
        precision: 1,
        answer: 3.5,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('1 dp'))).toBe(true);
  });

  it('answer key for round to whole uses integer formatting', () => {
    render(
      [
        {
          skill: 'round-1dp',
          decimal: 3.7,
          precision: 0,
          answer: 4,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 4');
  });

  it('answer key for round to 1dp preserves the trailing zero', () => {
    render(
      [
        {
          skill: 'round-2dp',
          decimal: 3.0,
          precision: 1,
          answer: 3,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 3.0');
  });
});

describe('generateDecimalsPdf — compare-decimals', () => {
  it('renders the input list of decimals', () => {
    render([
      {
        skill: 'compare-decimals',
        decimals: [0.45, 0.5, 0.405, 0.54],
        answer: [0.405, 0.45, 0.5, 0.54],
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('Order'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('0.45'))).toBe(true);
  });

  it('answer key prints the ascending order joined by commas', () => {
    render(
      [
        {
          skill: 'compare-decimals',
          decimals: [0.45, 0.5, 0.405, 0.54],
          answer: [0.405, 0.45, 0.5, 0.54],
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 0.405, 0.45, 0.5, 0.54');
  });
});

describe('generateDecimalsPdf — fraction <-> decimal', () => {
  it('fraction-to-decimal uses unicode glyph for ½', () => {
    render([
      {
        skill: 'fraction-to-decimal',
        num: 1,
        den: 2,
        decimal: 0.5,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('½'))).toBe(true);
  });

  it('fraction-to-decimal uses textual "1/5" form for non-WinAnsi fractions', () => {
    render([
      {
        skill: 'fraction-to-decimal',
        num: 1,
        den: 5,
        decimal: 0.2,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('1/5'))).toBe(true);
    // The ⅕ glyph must NOT appear in the PDF text.
    expect(capturedTextCalls.some(t => t.includes('⅕'))).toBe(false);
  });

  it('answer key for fraction-to-decimal prints the decimal', () => {
    render(
      [
        {
          skill: 'fraction-to-decimal',
          num: 1,
          den: 4,
          decimal: 0.25,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 0.25');
  });

  it('answer key for decimal-to-fraction prints the WinAnsi glyph when safe', () => {
    render(
      [
        {
          skill: 'decimal-to-fraction',
          num: 1,
          den: 4,
          decimal: 0.25,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) ¼');
  });

  it('answer key for decimal-to-fraction uses textual form for non-WinAnsi fractions', () => {
    render(
      [
        {
          skill: 'decimal-to-fraction',
          num: 2,
          den: 5,
          decimal: 0.4,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 2/5');
  });
});

describe('generateDecimalsPdf — percent skills', () => {
  it('percent-fraction: stem has "%" (U+0025 ASCII)', () => {
    render([
      {
        skill: 'percent-fraction',
        percent: 25,
        decimal: 0.25,
        num: 1,
        den: 4,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('25%'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('as a fraction'))).toBe(true);
  });

  it('percent-decimal answer key prints the decimal', () => {
    render(
      [
        {
          skill: 'percent-decimal',
          percent: 25,
          decimal: 0.25,
          num: 1,
          den: 4,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 0.25');
  });

  it('decimal-percent answer key prints the percent value', () => {
    render(
      [
        {
          skill: 'decimal-percent',
          percent: 50,
          decimal: 0.5,
          num: 1,
          den: 2,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 50%');
  });
});

describe('generateDecimalsPdf — add/subtract decimals', () => {
  it('add stem prints "+" between operands', () => {
    render([
      {
        skill: 'add-decimals',
        a: 0.3,
        b: 0.4,
        answer: 0.7,
        sign: '+',
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('+'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('0.3'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('0.4'))).toBe(true);
  });

  it('subtract stem uses ASCII hyphen-minus, never U+2212', () => {
    render([
      {
        skill: 'subtract-decimals',
        a: 0.5,
        b: 0.2,
        answer: 0.3,
        sign: '-',
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('-'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('−'))).toBe(false);
  });

  it('answer key prints the numeric answer', () => {
    render(
      [
        {
          skill: 'add-decimals',
          a: 0.3,
          b: 0.4,
          answer: 0.7,
          sign: '+',
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 0.7');
  });
});

describe('generateDecimalsPdf — question numbering', () => {
  it('numbers questions starting at 1.', () => {
    render([
      {
        skill: 'identify-tenths',
        decimal: 0.3,
        answerNum: 3,
        answerDen: 10,
      },
      {
        skill: 'identify-tenths',
        decimal: 0.7,
        answerNum: 7,
        answerDen: 10,
      },
    ]);
    expect(capturedTextCalls).toContain('1.  ');
    expect(capturedTextCalls).toContain('2.  ');
  });

  it('numbers continue across multiple pages', () => {
    capturedTextCalls.length = 0;
    generateDecimalsPdf({
      pages: [
        [{ skill: 'identify-tenths', decimal: 0.1, answerNum: 1, answerDen: 10 }],
        [{ skill: 'identify-tenths', decimal: 0.2, answerNum: 2, answerDen: 10 }],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 1/10');
    expect(capturedTextCalls).toContain('2) 2/10');
  });
});

describe('generateDecimalsPdf — encoding safety', () => {
  it('no math-operators-block characters across a wide skill mix', () => {
    render(
      [
        { skill: 'identify-tenths', decimal: 0.3, answerNum: 3, answerDen: 10 },
        { skill: 'identify-hundredths', decimal: 0.45, answerNum: 45, answerDen: 100 },
        { skill: 'identify-thousandths', decimal: 0.275, answerNum: 275, answerDen: 1000 },
        { skill: 'round-1dp', decimal: 3.7, precision: 0, answer: 4 },
        { skill: 'round-2dp', decimal: 3.45, precision: 1, answer: 3.5 },
        {
          skill: 'compare-decimals',
          decimals: [0.45, 0.5, 0.405, 0.54],
          answer: [0.405, 0.45, 0.5, 0.54],
        },
        { skill: 'fraction-to-decimal', num: 1, den: 4, decimal: 0.25 },
        { skill: 'fraction-to-decimal', num: 1, den: 5, decimal: 0.2 },
        { skill: 'decimal-to-fraction', num: 3, den: 4, decimal: 0.75 },
        { skill: 'decimal-to-fraction', num: 4, den: 5, decimal: 0.8 },
        { skill: 'percent-fraction', percent: 25, decimal: 0.25, num: 1, den: 4 },
        { skill: 'percent-decimal', percent: 25, decimal: 0.25, num: 1, den: 4 },
        { skill: 'decimal-percent', percent: 50, decimal: 0.5, num: 1, den: 2 },
        { skill: 'add-decimals', a: 0.3, b: 0.4, answer: 0.7, sign: '+' },
        { skill: 'subtract-decimals', a: 0.5, b: 0.2, answer: 0.3, sign: '-' },
      ],
      { includeAnswerKey: true }
    );
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}"`).toBe(false);
      expect(t.includes('−'), `math-minus in "${t}"`).toBe(false);
    });
  });

  it('non-WinAnsi unicode fraction glyphs never appear', () => {
    render(
      [
        { skill: 'fraction-to-decimal', num: 1, den: 5, decimal: 0.2 },
        { skill: 'fraction-to-decimal', num: 2, den: 5, decimal: 0.4 },
        { skill: 'fraction-to-decimal', num: 3, den: 5, decimal: 0.6 },
        { skill: 'fraction-to-decimal', num: 4, den: 5, decimal: 0.8 },
        { skill: 'decimal-to-fraction', num: 2, den: 5, decimal: 0.4 },
      ],
      { includeAnswerKey: true }
    );
    const FORBIDDEN_GLYPHS = ['⅕', '⅖', '⅗', '⅘', '⅓', '⅔', '⅛'];
    capturedTextCalls.forEach(t => {
      FORBIDDEN_GLYPHS.forEach(g => {
        expect(t.includes(g), `forbidden glyph "${g}" in "${t}"`).toBe(false);
      });
    });
  });

  it('percent sign is the ASCII % (U+0025)', () => {
    render(
      [
        { skill: 'percent-fraction', percent: 25, decimal: 0.25, num: 1, den: 4 },
        { skill: 'decimal-percent', percent: 50, decimal: 0.5, num: 1, den: 2 },
      ],
      { includeAnswerKey: true }
    );
    // Find any text call containing '%'. Each occurrence must be ASCII 0x25.
    capturedTextCalls.forEach(t => {
      for (let i = 0; i < t.length; i++) {
        if (t[i] === '%') {
          expect(t.charCodeAt(i)).toBe(0x25);
        }
      }
    });
  });
});

describe('generateDecimalsPdf — answer-key encoding sweep', () => {
  it('passes the /[∀-⋿]/u regex over every text call', () => {
    capturedTextCalls.length = 0;
    generateDecimalsPdf({
      pages: [
        [
          { skill: 'identify-tenths', decimal: 0.3, answerNum: 3, answerDen: 10 },
          { skill: 'round-2dp', decimal: 3.45, precision: 1, answer: 3.5 },
          { skill: 'percent-fraction', percent: 75, decimal: 0.75, num: 3, den: 4 },
          { skill: 'subtract-decimals', a: 0.9, b: 0.45, answer: 0.45, sign: '-' },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(/[∀-⋿]/u.test(t), `unrenderable char in "${t}"`).toBe(false);
    });
  });
});
