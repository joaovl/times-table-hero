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

const symbolFor = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

describe('generateArithPdf — horizontal layout (≤ 3 digits)', () => {
  it('renders an add question as "a + b ="', () => {
    render([{ op: 'add', operand1: 234, operand2: 567, answer: 801 }]);
    expect(capturedTextCalls).toContain('234 + 567 =');
  });

  it('renders a subtract question as "a − b ="', () => {
    render([{ op: 'subtract', operand1: 90, operand2: 45, answer: 45 }]);
    expect(capturedTextCalls).toContain('90 − 45 =');
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

  it('column subtract draws minus symbol', () => {
    render([{ op: 'subtract', operand1: 9000, operand2: 1234, answer: 7766 }]);
    expect(capturedTextCalls).toContain('9000');
    expect(capturedTextCalls).toContain('1234');
    expect(capturedTextCalls).toContain('−');
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
