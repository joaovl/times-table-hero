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
import type { ArithOp, ArithQuestion, ArithSettings } from './logic';
import { perPageOptionsForOp } from './printConfig';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: ArithQuestion[]) =>
  generateArithPdf({ pages: [qs], title: 'Test', subtitle: '' });

// Mirror the PDF-safe glyph used by pdf.ts (hyphen-minus, not U+2212).
const symbolFor = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '-' : '×';

// PDF prefixes equations with the question number ("1.  7 + 8 =") so we
// match by suffix when we don't know what the running number is.
const someTextEndsWith = (suffix: string): boolean =>
  capturedTextCalls.some(t => t.endsWith(suffix));

// Regex matching any character in the Unicode Mathematical Operators block
// (U+2200..U+22FF). No char in this block is in Helvetica's WinAnsi
// encoding, so any such char passed to doc.text() will mis-render.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateArithPdf — question numbering', () => {
  it('prefixes horizontal questions with their 1-based number', () => {
    render([
      { op: 'add', operand1: 1, operand2: 2, answer: 3 },
      { op: 'add', operand1: 4, operand2: 5, answer: 9 },
    ]);
    expect(capturedTextCalls).toContain('1.  1 + 2 =');
    expect(capturedTextCalls).toContain('2.  4 + 5 =');
  });

  it('numbers continue across multiple pages', () => {
    capturedTextCalls.length = 0;
    generateArithPdf({
      pages: [
        [{ op: 'add', operand1: 1, operand2: 1, answer: 2 }],
        [{ op: 'add', operand1: 2, operand2: 2, answer: 4 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.  1 + 1 =');
    expect(capturedTextCalls).toContain('2.  2 + 2 =');
  });

  it('column-form questions render their number above the stack', () => {
    capturedTextCalls.length = 0;
    generateArithPdf({
      pages: [[{ op: 'add', operand1: 12345, operand2: 67890, answer: 80235 }]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('12345');
    expect(capturedTextCalls).toContain('67890');
  });
});

describe('generateArithPdf — answer key', () => {
  it('does not include answers when includeAnswerKey is unset', () => {
    capturedTextCalls.length = 0;
    generateArithPdf({
      pages: [[{ op: 'add', operand1: 7, operand2: 8, answer: 15 }]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).not.toContain('1) 15');
  });

  it('appends a numbered answer page when includeAnswerKey is true', () => {
    capturedTextCalls.length = 0;
    generateArithPdf({
      pages: [
        [
          { op: 'add', operand1: 7, operand2: 8, answer: 15 },
          { op: 'subtract', operand1: 90, operand2: 45, answer: 45 },
        ],
        [{ op: 'multiply', operand1: 12, operand2: 9, answer: 108 }],
      ],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    // Continuous numbering across pages: 1) 15, 2) 45, 3) 108
    expect(capturedTextCalls).toContain('1) 15');
    expect(capturedTextCalls).toContain('2) 45');
    expect(capturedTextCalls).toContain('3) 108');
    // Answer key has its own header
    expect(capturedTextCalls).toContain('Maths — Answer Key');
  });
});

describe('generateArithPdf — horizontal layout (≤ 3 digits)', () => {
  it('renders an add question as "a + b =" (with number prefix)', () => {
    render([{ op: 'add', operand1: 234, operand2: 567, answer: 801 }]);
    expect(capturedTextCalls).toContain('1.  234 + 567 =');
  });

  it('renders a subtract question as "a - b =" (ASCII hyphen, not U+2212)', () => {
    render([{ op: 'subtract', operand1: 90, operand2: 45, answer: 45 }]);
    expect(someTextEndsWith('90 - 45 =')).toBe(true);
    // The Unicode math-minus would render as a stray quote in Helvetica.
    expect(capturedTextCalls.some(t => t.includes('−'))).toBe(false);
  });

  it('renders a multiply question as "a × b ="', () => {
    render([{ op: 'multiply', operand1: 12, operand2: 9, answer: 108 }]);
    expect(someTextEndsWith('12 × 9 =')).toBe(true);
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
    multiplyLevel: 'd2x1',
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  const containsHorizontal = (q: ArithQuestion): boolean =>
    capturedTextCalls.some(t => t.endsWith(`${q.operand1} ${symbolFor(q.op)} ${q.operand2} =`));

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

describe('generateArithPdf — page capacity (no silent question dropping)', () => {
  // Build N synthetic questions of a given digit-count band so we can
  // verify exact rendered count without relying on the random generator.
  const buildAddQs = (count: number, digits: number): ArithQuestion[] => {
    const min = digits <= 1 ? 0 : 10 ** (digits - 1);
    return Array.from({ length: count }, (_, i) => ({
      op: 'add' as const,
      operand1: min + i,
      operand2: min + i + 1,
      answer: 2 * (min + i) + 1,
    }));
  };

  it('renders all 80 horizontal questions on a single page (2-digit add)', () => {
    const qs = buildAddQs(80, 2);
    render(qs);
    qs.forEach(q => {
      expect(someTextEndsWith(`${q.operand1} + ${q.operand2} =`)).toBe(true);
    });
  });

  it('renders all 60 horizontal questions on a single page (3-digit add)', () => {
    const qs = buildAddQs(60, 3);
    render(qs);
    qs.forEach(q => {
      expect(someTextEndsWith(`${q.operand1} + ${q.operand2} =`)).toBe(true);
    });
  });

  it('renders all 20 column-form questions on a single page (5-digit subtract)', () => {
    const qs: ArithQuestion[] = Array.from({ length: 20 }, (_, i) => ({
      op: 'subtract' as const,
      operand1: 90000 + i,
      operand2: 10000 + i,
      answer: 80000,
    }));
    render(qs);
    qs.forEach(q => {
      expect(capturedTextCalls).toContain(`${q.operand1}`);
      expect(capturedTextCalls).toContain(`${q.operand2}`);
    });
  });

  // The exact reproducer of the user-reported bug: subtract / 5-digit / hard /
  // 80 questions used to silently render only the first ~20.
  it('80 column-form questions: every operand pair appears (no silent dropping)', () => {
    const qs: ArithQuestion[] = Array.from({ length: 80 }, (_, i) => ({
      op: 'subtract' as const,
      operand1: 90000 + i,
      operand2: 10000 + i,
      answer: 80000,
    }));
    render(qs);
    qs.forEach(q => {
      expect(capturedTextCalls).toContain(`${q.operand1}`);
      expect(capturedTextCalls).toContain(`${q.operand2}`);
    });
  });
});

describe('generateArithPdf — encoding safety (no Math Operators block chars)', () => {
  const baseSettings: ArithSettings = {
    operation: 'add',
    difficulty: 'medium',
    digitMode: { kind: 'exact', digits: 2 },
    multiplyLevel: 'd2x1',
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

  // The single most powerful regression test: walks every (op × difficulty
  // × digit-mode × per-page count) combination the modal can produce, runs
  // it through the generator and the PDF renderer, and asserts that:
  //   1. Every generated question's operands appear in the PDF text stream.
  //   2. No character outside Helvetica's WinAnsi encoding is written.
  //   3. The answer value is never leaked into the PDF.
  // If any future change breaks the path from a modal selection to a
  // correctly-rendered PDF, this test catches it.
  it('end-to-end: every modal selection produces a correct PDF', () => {
    const ops: ArithOp[] = ['add', 'subtract', 'multiply', 'all'];
    const diffs: ArithSettings['difficulty'][] = ['easy', 'medium', 'hard'];
    const digitModes: ArithSettings['digitMode'][] = [
      { kind: 'exact', digits: 1 },
      { kind: 'exact', digits: 2 },
      { kind: 'exact', digits: 3 },
      { kind: 'exact', digits: 4 },
      { kind: 'exact', digits: 5 },
      { kind: 'upTo', digits: 3 },
      { kind: 'upTo', digits: 5 },
    ];

    let combos = 0;
    for (const operation of ops) {
      const perPageOpts = perPageOptionsForOp(operation);
      for (const difficulty of diffs) {
        for (const digitMode of digitModes) {
          for (const perPage of perPageOpts) {
            combos++;
            capturedTextCalls.length = 0;
            const settings: ArithSettings = {
              operation,
              difficulty,
              digitMode,
              multiplyLevel: 'd2x1',
              gameMode: 'questions',
              questionCount: perPage,
              timeLimit: 0,
            };
            const qs = generateArithQuestions(settings, perPage);
            expect(qs).toHaveLength(perPage);
            render(qs);

            // 1. Every question's operands appear (no silent drops).
            //    Layout is page-wide: if any question on the page has ≥4
            //    digits then ALL questions render in column form (separate
            //    text() calls per operand). Otherwise horizontal (the full
            //    equation written as a single text() call).
            const pageMaxDigits = qs.reduce(
              (m, q) => Math.max(m, String(q.operand1).length, String(q.operand2).length),
              0
            );
            const useColumn = pageMaxDigits >= 4;

            qs.forEach(q => {
              const ctx = `op=${operation} diff=${difficulty} digits=${digitMode.kind} ${digitMode.digits} count=${perPage} q=${JSON.stringify(q)}`;
              if (useColumn) {
                expect(capturedTextCalls, ctx).toContain(`${q.operand1}`);
                expect(capturedTextCalls, ctx).toContain(`${q.operand2}`);
              } else {
                const eqSuffix = `${q.operand1} ${symbolFor(q.op)} ${q.operand2} =`;
                expect(
                  capturedTextCalls.some(t => t.endsWith(eqSuffix)),
                  ctx
                ).toBe(true);
              }
            });

            // 2. No Math Operators block chars (would mis-render in Helvetica).
            capturedTextCalls.forEach(t => {
              expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
            });

            // 3. No answer leak.
            qs.forEach(q => {
              expect(capturedTextCalls).not.toContain(`= ${q.answer}`);
            });
          }
        }
      }
    }
    // Sanity: we actually iterated through a meaningful matrix size.
    expect(combos).toBeGreaterThan(200);
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
