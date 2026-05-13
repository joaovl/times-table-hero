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

import { generateAlgebraPdf, answerKeyText } from './pdf';
import { generateAlgebraQuestions, ALL_SKILLS } from './logic';
import type { AlgebraQuestion, AlgebraSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: AlgebraQuestion[], opts: { includeAnswerKey?: boolean } = {}) =>
  generateAlgebraPdf({
    pages: [qs],
    title: 'Maths Challenge - Algebra',
    subtitle: '',
    includeAnswerKey: opts.includeAnswerKey,
  });

const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateAlgebraPdf — basic rendering', () => {
  it('emits a numbered prompt for formula-eval', () => {
    render([
      {
        skill: 'formula-eval',
        formula: 'perimeter',
        inputs: [{ name: 'l', value: 3 }, { name: 'w', value: 4 }],
        resultName: 'p',
        formulaText: 'p = 2(l + w)',
        answer: 14,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('p = 2(l + w)'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('l = 3'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('w = 4'))).toBe(true);
  });

  it('emits a missing-number prompt', () => {
    render([
      { skill: 'missing-number', varName: 'a', coeff: 3, constant: 4, rhs: 10, answer: 2 },
    ]);
    expect(capturedTextCalls.some(t => t.includes('3a + 4 = 10'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('Find a.'))).toBe(true);
  });

  it('emits a sequence-next prompt with the visible 4 terms', () => {
    render([
      { skill: 'sequence-next', sequence: [2, 5, 8, 11], step: 3, start: 2, answer: [14, 17] },
    ]);
    expect(capturedTextCalls.some(t => t.includes('2, 5, 8, 11, ?, ?'))).toBe(true);
  });

  it('emits a sequence-rule prompt', () => {
    render([
      { skill: 'sequence-rule', sequence: [3, 7, 11, 15], step: 4, answer: 'add 4' },
    ]);
    expect(capturedTextCalls.some(t => t.includes('rule'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('3, 7, 11, 15'))).toBe(true);
  });

  it('emits an expression-evaluate prompt', () => {
    render([
      {
        skill: 'expression-evaluate',
        varName: 'x',
        varValue: 5,
        coeff: 3,
        constant: -2,
        expression: '3x - 2',
        answer: 13,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('If x = 5'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('3x - 2'))).toBe(true);
  });
});

describe('generateAlgebraPdf — answer key', () => {
  it('emits "n) value" for each answer when includeAnswerKey is true', () => {
    render(
      [
        {
          skill: 'formula-eval',
          formula: 'perimeter',
          inputs: [{ name: 'l', value: 3 }, { name: 'w', value: 4 }],
          resultName: 'p',
          formulaText: 'p = 2(l + w)',
          answer: 14,
        },
        { skill: 'missing-number', varName: 'a', coeff: 3, constant: 4, rhs: 10, answer: 2 },
        { skill: 'sequence-next', sequence: [2, 5, 8, 11], step: 3, start: 2, answer: [14, 17] },
        { skill: 'sequence-rule', sequence: [3, 7, 11, 15], step: 4, answer: 'add 4' },
        {
          skill: 'expression-evaluate',
          varName: 'x',
          varValue: 5,
          coeff: 3,
          constant: -2,
          expression: '3x - 2',
          answer: 13,
        },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 14');
    expect(capturedTextCalls).toContain('2) 2');
    expect(capturedTextCalls).toContain('3) 14, 17');
    expect(capturedTextCalls).toContain('4) add 4');
    expect(capturedTextCalls).toContain('5) 13');
  });

  it('answerKeyText returns "n) value"', () => {
    const q: AlgebraQuestion = {
      skill: 'missing-number',
      varName: 'a',
      coeff: 3,
      constant: 4,
      rhs: 10,
      answer: 2,
    };
    expect(answerKeyText(q, 7)).toBe('7) 2');
  });

  it('does not emit answers when includeAnswerKey is unset', () => {
    render([{ skill: 'missing-number', varName: 'a', coeff: 3, constant: 4, rhs: 10, answer: 2 }]);
    expect(capturedTextCalls.includes('1) 2')).toBe(false);
  });
});

describe('generateAlgebraPdf — encoding safety', () => {
  const baseSettings: AlgebraSettings = {
    skills: ALL_SKILLS,
    difficulty: 'hard',
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  it('no Mathematical Operators block chars in any text call', () => {
    capturedTextCalls.length = 0;
    const qs = generateAlgebraQuestions(baseSettings, 50);
    render(qs, { includeAnswerKey: true });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe in "${t}"`).toBe(false);
    });
  });

  it('no U+2212 mathematical minus is emitted', () => {
    capturedTextCalls.length = 0;
    const qs = generateAlgebraQuestions(baseSettings, 40);
    render(qs);
    capturedTextCalls.forEach(t => {
      expect(t.includes('−')).toBe(false);
    });
  });
});

describe('generateAlgebraPdf — multi-page', () => {
  it('continuous question numbering across pages', () => {
    capturedTextCalls.length = 0;
    generateAlgebraPdf({
      pages: [
        [{ skill: 'missing-number', varName: 'a', coeff: 2, constant: 1, rhs: 7, answer: 3 }],
        [{ skill: 'missing-number', varName: 'a', coeff: 4, constant: 0, rhs: 12, answer: 3 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls.some(t => t.startsWith('1.  '))).toBe(true);
    expect(capturedTextCalls.some(t => t.startsWith('2.  '))).toBe(true);
  });
});

describe('generateAlgebraPdf — header / name', () => {
  it('renders title and "Name:" label', () => {
    render([{ skill: 'missing-number', varName: 'a', coeff: 2, constant: 1, rhs: 7, answer: 3 }]);
    expect(capturedTextCalls).toContain('Maths Challenge - Algebra');
    expect(capturedTextCalls).toContain('Name:');
  });

  it('renders studentName when provided', () => {
    capturedTextCalls.length = 0;
    generateAlgebraPdf({
      pages: [[{ skill: 'missing-number', varName: 'a', coeff: 2, constant: 1, rhs: 7, answer: 3 }]],
      title: 'T',
      subtitle: '',
      studentName: 'Sam',
    });
    expect(capturedTextCalls).toContain('Sam');
  });
});
