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
    line() {}
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

import { generateArithPdf } from './pdf';
import { generateArithQuestions } from './logic';
import type { ArithQuestion, ArithSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: ArithQuestion[]) =>
  generateArithPdf({ pages: [qs], title: 'Test', subtitle: '' });

// Mirror the PDF-safe glyph used by pdf.ts (hyphen-minus, not U+2212).
const symbolFor = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '-' : '×';

// Regex matching any character in the Unicode Mathematical Operators block
// (U+2200..U+22FF). No char in this block is in Helvetica's WinAnsi
// encoding, so any such char passed to doc.text() will mis-render.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateArithPdf — horizontal layout (≤ 3 digits)', () => {
  it('renders an add question as "a + b ="', () => {
    render([{ op: 'add', operand1: 234, operand2: 567, answer: 801 }]);
    expect(capturedTextCalls).toContain('234 + 567 =');
  });

  it('renders a subtract question as "a - b =" (ASCII hyphen, not U+2212)', () => {
    render([{ op: 'subtract', operand1: 90, operand2: 45, answer: 45 }]);
    expect(capturedTextCalls).toContain('90 - 45 =');
    // The Unicode math-minus would render as a stray quote in Helvetica.
    expect(capturedTextCalls).not.toContain('90 − 45 =');
  });

  it('renders a multiply question as "a × b ="', () => {
    render([{ op: 'multiply', operand1: 12, operand2: 9, answer: 108 }]);
    expect(capturedTextCalls).toContain('12 × 9 =');
  });

  it('does not leak the answer in the rendered text', () => {
    render([{ op: 'add', operand1: 234, operand2: 567, answer: 801 }]);
    expect(capturedTextCalls.filter(s => s === '801')).toHaveLength(0);
    expect(capturedTextCalls.filter(s => s.includes('= 801'))).toHaveLength(0);
  });
});

describe('generateArithPdf — column layout (≥ 4 digits)', () => {
  it('renders top operand, symbol, and bottom operand as separate text calls', () => {
    render([{ op: 'add', operand1: 1234, operand2: 5678, answer: 6912 }]);
    expect(capturedTextCalls).toContain('1234');
    expect(capturedTextCalls).toContain('5678');
    expect(capturedTextCalls).toContain('+');
  });

  it('column subtract draws ASCII hyphen-minus, not U+2212', () => {
    render([{ op: 'subtract', operand1: 9000, operand2: 1234, answer: 7766 }]);
    expect(capturedTextCalls).toContain('9000');
    expect(capturedTextCalls).toContain('1234');
    expect(capturedTextCalls).toContain('-');
    expect(capturedTextCalls).not.toContain('−');
  });

  it('column multiply draws times symbol', () => {
    render([{ op: 'multiply', operand1: 1234, operand2: 56, answer: 69104 }]);
    expect(capturedTextCalls).toContain('1234');
    expect(capturedTextCalls).toContain('56');
    expect(capturedTextCalls).toContain('×');
  });

  it('does not leak the answer in column layout', () => {
    render([{ op: 'add', operand1: 1234, operand2: 5678, answer: 6912 }]);
    expect(capturedTextCalls.filter(s => s === '6912')).toHaveLength(0);
  });
});

describe('generateArithPdf — round-trip with generateArithQuestions', () => {
  const baseSettings: ArithSettings = {
    operation: 'add',
    difficulty: 'medium',
    digitMode: { kind: 'exact', digits: 2 },
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  const containsHorizontal = (q: ArithQuestion): boolean =>
    capturedTextCalls.includes(`${q.operand1} ${symbolFor(q.op)} ${q.operand2} =`);

  const containsColumn = (q: ArithQuestion): boolean =>
    capturedTextCalls.includes(`${q.operand1}`) &&
    capturedTextCalls.includes(`${q.operand2}`) &&
    capturedTextCalls.includes(symbolFor(q.op));

  it('every add question (2-digit horizontal) appears in PDF', () => {
    const qs = generateArithQuestions(baseSettings, 20);
    render(qs);
    qs.forEach(q => expect(containsHorizontal(q)).toBe(true));
  });

  it('every subtract question (3-digit horizontal) appears in PDF', () => {
    const qs = generateArithQuestions(
      { ...baseSettings, operation: 'subtract', digitMode: { kind: 'exact', digits: 3 } },
      20
    );
    render(qs);
    qs.forEach(q => expect(containsHorizontal(q)).toBe(true));
  });

  it('every 4-digit add question appears in column form (operands + symbol)', () => {
    const qs = generateArithQuestions(
      { ...baseSettings, operation: 'add', digitMode: { kind: 'exact', digits: 4 } },
      10
    );
    render(qs);
    qs.forEach(q => expect(containsColumn(q)).toBe(true));
  });

  it("'all' mode: every 2-digit question matches its rendered horizontal form", () => {
    const qs = generateArithQuestions(
      { ...baseSettings, operation: 'all', digitMode: { kind: 'exact', digits: 2 } },
      30
    );
    render(qs);
    qs.forEach(q => expect(containsHorizontal(q)).toBe(true));
  });
});

describe('generateArithPdf — encoding safety (no Math Operators block chars)', () => {
  const baseSettings: ArithSettings = {
    operation: 'add',
    difficulty: 'medium',
    digitMode: { kind: 'exact', digits: 2 },
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  // Reproduces the exact failure mode the user reported: subtract • hard •
  // exactly 5-digit • 20 questions printed the math-minus as a stray quote.
  it('subtract / exactly 5-digit / hard / 20 questions: no U+2212 in PDF', () => {
    const qs = generateArithQuestions(
      { ...baseSettings, operation: 'subtract', difficulty: 'hard', digitMode: { kind: 'exact', digits: 5 } },
      20
    );
    render(qs);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}"`).toBe(false);
    });
    // And the actual rendered subtract glyph must be the ASCII hyphen-minus.
    qs.forEach(q => {
      // 5-digit operands trigger column layout, where operands and symbol
      // are written as separate text() calls.
      expect(capturedTextCalls).toContain('-');
      expect(capturedTextCalls).toContain(`${q.operand1}`);
      expect(capturedTextCalls).toContain(`${q.operand2}`);
    });
  });

  it('exhaustive: no op/difficulty/digit combo writes a Mathematical Operators block char', () => {
    const ops: ArithSettings['operation'][] = ['add', 'subtract', 'multiply', 'all'];
    const diffs: ArithSettings['difficulty'][] = ['easy', 'medium', 'hard'];
    const digitModes = [
      { kind: 'exact' as const, digits: 1 },
      { kind: 'exact' as const, digits: 2 },
      { kind: 'exact' as const, digits: 3 },
      { kind: 'exact' as const, digits: 4 },
      { kind: 'exact' as const, digits: 5 },
      { kind: 'upTo' as const, digits: 3 },
      { kind: 'upTo' as const, digits: 5 },
    ];

    for (const operation of ops) {
      for (const difficulty of diffs) {
        for (const digitMode of digitModes) {
          capturedTextCalls.length = 0;
          const qs = generateArithQuestions(
            { ...baseSettings, operation, difficulty, digitMode },
            20
          );
          render(qs);
          capturedTextCalls.forEach(t => {
            expect(
              MATH_OPERATORS_BLOCK.test(t),
              `unrenderable char in "${t}" (op=${operation} diff=${difficulty} digits=${digitMode.kind} ${digitMode.digits})`
            ).toBe(false);
          });
        }
      }
    }
  });
});
