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

import { generateWorksheetPdf } from './pdf';
import { generateQuestions } from './logic';
import type { Question } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: Question[]) =>
  generateWorksheetPdf({ pages: [qs], tablesLabel: 'test', questionCount: qs.length });

describe('generateWorksheetPdf — single-question rendering', () => {
  it('renders a multiply question as "a × b ="', () => {
    render([{ kind: 'binary', op: 'multiply', operand1: 7, operand2: 8, answer: 56 }]);
    expect(capturedTextCalls).toContain('7 × 8 =');
  });

  it('renders a divide question as "a ÷ b ="', () => {
    render([{ kind: 'binary', op: 'divide', operand1: 56, operand2: 7, answer: 8 }]);
    expect(capturedTextCalls).toContain('56 ÷ 7 =');
  });

  it('renders a square question with the operand and a superscript "2"', () => {
    render([{ kind: 'unary', op: 'square', operand: 7, answer: 49 }]);
    expect(capturedTextCalls).toContain('7');
    expect(capturedTextCalls).toContain('2');
    expect(capturedTextCalls).toContain(' =');
  });

  it('renders a sqrt question with the radicand operand', () => {
    render([{ kind: 'unary', op: 'sqrt', operand: 49, answer: 7 }]);
    expect(capturedTextCalls).toContain('49');
    expect(capturedTextCalls).toContain(' =');
  });

  it('does not render the answer for a multiply question', () => {
    render([{ kind: 'binary', op: 'multiply', operand1: 7, operand2: 8, answer: 56 }]);
    // The answer 56 should never appear as a standalone text call (only operands and "= ").
    expect(capturedTextCalls.filter(s => s === '56')).toHaveLength(0);
    expect(capturedTextCalls.filter(s => s.includes('= 56'))).toHaveLength(0);
  });
});

describe('generateWorksheetPdf — round-trip with generateQuestions', () => {
  it('every binary multiply question generated appears in the PDF text stream', () => {
    const qs = generateQuestions([2, 3, 4, 5], 20, 'multiply');
    render(qs);
    qs.forEach(q => {
      if (q.kind === 'binary') {
        expect(capturedTextCalls).toContain(`${q.operand1} × ${q.operand2} =`);
      }
    });
  });

  it('every divide question generated appears in the PDF text stream', () => {
    const qs = generateQuestions([3, 5, 7], 15, 'divide');
    render(qs);
    qs.forEach(q => {
      if (q.kind === 'binary') {
        expect(capturedTextCalls).toContain(`${q.operand1} ÷ ${q.operand2} =`);
      }
    });
  });

  it('every square question operand appears in the PDF text stream', () => {
    const qs = generateQuestions([2, 5, 9], 12, 'square');
    render(qs);
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'square') {
        expect(capturedTextCalls).toContain(`${q.operand}`);
      }
    });
  });

  it('every sqrt radicand appears in the PDF text stream', () => {
    const qs = generateQuestions([2, 5, 9], 12, 'sqrt');
    render(qs);
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'sqrt') {
        expect(capturedTextCalls).toContain(`${q.operand}`);
      }
    });
  });

  it("'all' mode: every question (any op) is represented in the PDF", () => {
    const qs = generateQuestions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 100, 'all');
    render(qs);

    const rendered = (q: Question): boolean => {
      if (q.kind === 'binary') {
        const sym = q.op === 'multiply' ? '×' : '÷';
        return capturedTextCalls.includes(`${q.operand1} ${sym} ${q.operand2} =`);
      }
      return capturedTextCalls.includes(`${q.operand}`);
    };

    qs.forEach(q => expect(rendered(q)).toBe(true));
  });
});

describe('generateWorksheetPdf — encoding safety (no Math Operators block chars)', () => {
  // Any char in U+2200..U+22FF is outside Helvetica's WinAnsi encoding
  // and would mis-render in the PDF (e.g. √ as a stray quote).
  const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

  it("'all' mode with full table set never writes Math Operators block chars", () => {
    const qs = generateQuestions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 100, 'all');
    render(qs);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}"`).toBe(false);
    });
  });

  it('every operation alone never writes Math Operators block chars', () => {
    for (const op of ['multiply', 'divide', 'square', 'sqrt', 'all'] as const) {
      capturedTextCalls.length = 0;
      const qs = generateQuestions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 50, op);
      render(qs);
      capturedTextCalls.forEach(t => {
        expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}" for op=${op}`).toBe(false);
      });
    }
  });
});
