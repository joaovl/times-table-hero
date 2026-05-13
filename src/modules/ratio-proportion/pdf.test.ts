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

import { generateRatioPdf, answerKeyText } from './pdf';
import { generateRatioQuestions } from './logic';
import type { RatioQuestion, RatioSettings } from './logic';
import { ALL_SKILLS } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: RatioQuestion[], opts: { includeAnswerKey?: boolean } = {}) =>
  generateRatioPdf({
    pages: [qs],
    title: 'Maths Challenge - Ratio & Proportion',
    subtitle: '',
    includeAnswerKey: opts.includeAnswerKey,
  });

// Any character in U+2200..U+22FF (Mathematical Operators) is unsafe.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateRatioPdf — basic rendering', () => {
  it('emits a numbered question prompt for percent-of', () => {
    render([{ skill: 'percent-of', percent: 15, whole: 80, answer: 12 }]);
    expect(capturedTextCalls.some(t => t.includes('15% of 80?'))).toBe(true);
    expect(capturedTextCalls.some(t => t.startsWith('1.  '))).toBe(true);
  });

  it('emits a prompt for scale-factor with × glyph (WinAnsi-safe)', () => {
    render([{ skill: 'scale-factor', length: 6, factor: 3, units: 'cm', answer: 18 }]);
    expect(capturedTextCalls.some(t => t.includes('Scale 6 cm by × 3'))).toBe(true);
  });

  it('emits ratio-share with colon and total', () => {
    render([{ skill: 'ratio-share', total: 40, a: 3, b: 5, answer: [15, 25] }]);
    expect(capturedTextCalls.some(t => t.includes('Share 40 in the ratio 3:5'))).toBe(true);
  });

  it('emits ratio-simplify with colon', () => {
    render([{ skill: 'ratio-simplify', left: 12, right: 18, answer: [2, 3] }]);
    expect(capturedTextCalls.some(t => t.includes('Simplify the ratio 12:18'))).toBe(true);
  });

  it('emits ratio-equivalent with both right-missing and left-missing forms', () => {
    capturedTextCalls.length = 0;
    render([{ skill: 'ratio-equivalent', a: 2, b: 5, given: 6, missing: 'right', answer: 15 }]);
    expect(capturedTextCalls.some(t => t.includes('2:5 = 6:?'))).toBe(true);

    capturedTextCalls.length = 0;
    render([{ skill: 'ratio-equivalent', a: 2, b: 5, given: 15, missing: 'left', answer: 6 }]);
    expect(capturedTextCalls.some(t => t.includes('2:5 = ?:15'))).toBe(true);
  });
});

describe('generateRatioPdf — answer key', () => {
  it('does not emit the answer key when includeAnswerKey is false', () => {
    render([{ skill: 'percent-of', percent: 15, whole: 80, answer: 12 }]);
    expect(capturedTextCalls.some(t => t === '1) 12')).toBe(false);
  });

  it('emits a numbered answer line per question when includeAnswerKey is true', () => {
    render(
      [
        { skill: 'percent-of', percent: 15, whole: 80, answer: 12 },
        { skill: 'scale-factor', length: 6, factor: 3, units: 'cm', answer: 18 },
        { skill: 'ratio-share', total: 40, a: 3, b: 5, answer: [15, 25] },
        { skill: 'ratio-simplify', left: 12, right: 18, answer: [2, 3] },
        { skill: 'ratio-equivalent', a: 2, b: 5, given: 6, missing: 'right', answer: 15 },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 12');
    expect(capturedTextCalls).toContain('2) 18');
    expect(capturedTextCalls).toContain('3) 15 and 25');
    expect(capturedTextCalls).toContain('4) 2:3');
    expect(capturedTextCalls).toContain('5) 15');
  });

  it('answerKeyText emits "n) value" form', () => {
    expect(answerKeyText({ skill: 'percent-of', percent: 15, whole: 80, answer: 12 }, 7)).toBe(
      '7) 12'
    );
  });
});

describe('generateRatioPdf — encoding safety', () => {
  const baseSettings: RatioSettings = {
    skills: ALL_SKILLS,
    difficulty: 'hard',
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  it('every text() call is free of Mathematical Operators block chars', () => {
    capturedTextCalls.length = 0;
    const qs = generateRatioQuestions(baseSettings, 40);
    render(qs, { includeAnswerKey: true });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no U+2212 mathematical minus is emitted', () => {
    capturedTextCalls.length = 0;
    const qs = generateRatioQuestions(baseSettings, 40);
    render(qs);
    capturedTextCalls.forEach(t => {
      expect(t.includes('−')).toBe(false);
    });
  });
});

describe('generateRatioPdf — multi-page', () => {
  it('renders 3 pages with continuous question numbering', () => {
    capturedTextCalls.length = 0;
    generateRatioPdf({
      pages: [
        [{ skill: 'percent-of', percent: 10, whole: 50, answer: 5 }],
        [{ skill: 'percent-of', percent: 20, whole: 50, answer: 10 }],
        [{ skill: 'percent-of', percent: 30, whole: 50, answer: 15 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls.some(t => t.startsWith('1.  '))).toBe(true);
    expect(capturedTextCalls.some(t => t.startsWith('2.  '))).toBe(true);
    expect(capturedTextCalls.some(t => t.startsWith('3.  '))).toBe(true);
  });
});

describe('generateRatioPdf — header', () => {
  it('renders title and "Name:" label', () => {
    render([{ skill: 'percent-of', percent: 10, whole: 80, answer: 8 }]);
    expect(capturedTextCalls).toContain('Maths Challenge - Ratio & Proportion');
    expect(capturedTextCalls).toContain('Name:');
  });

  it('renders the student name when provided', () => {
    capturedTextCalls.length = 0;
    generateRatioPdf({
      pages: [[{ skill: 'percent-of', percent: 10, whole: 80, answer: 8 }]],
      title: 'T',
      subtitle: '',
      studentName: 'Alex',
    });
    expect(capturedTextCalls).toContain('Alex');
  });
});

describe('generateRatioPdf — end-to-end round-trip', () => {
  it('every generated question appears in the PDF text stream', () => {
    capturedTextCalls.length = 0;
    const qs = generateRatioQuestions(
      {
        skills: ALL_SKILLS,
        difficulty: 'medium',
        gameMode: 'questions',
        questionCount: 30,
        timeLimit: 0,
      },
      30
    );
    render(qs);
    // Every question's prompt body should appear somewhere in the captured text.
    qs.forEach(q => {
      let snippet = '';
      if (q.skill === 'percent-of') snippet = `${q.percent}% of ${q.whole}?`;
      else if (q.skill === 'scale-factor') snippet = `Scale ${q.length} ${q.units} by × ${q.factor}.`;
      else if (q.skill === 'ratio-share') snippet = `Share ${q.total} in the ratio ${q.a}:${q.b}.`;
      else if (q.skill === 'ratio-simplify') snippet = `Simplify the ratio ${q.left}:${q.right}.`;
      else if (q.skill === 'ratio-equivalent')
        snippet = q.missing === 'right'
          ? `${q.a}:${q.b} = ${q.given}:?`
          : `${q.a}:${q.b} = ?:${q.given}`;
      expect(capturedTextCalls.some(t => t.includes(snippet)), `missing: ${snippet}`).toBe(true);
    });
  });
});
