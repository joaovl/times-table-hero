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

import { generateStatsPdf, answerKeyText } from './pdf';
import { generateStatsQuestions, ALL_SKILLS } from './logic';
import type { StatsQuestion, StatsSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: StatsQuestion[], opts: { includeAnswerKey?: boolean } = {}) =>
  generateStatsPdf({
    pages: [qs],
    title: 'Maths Challenge - Statistics',
    subtitle: '',
    includeAnswerKey: opts.includeAnswerKey,
  });

const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateStatsPdf — basic rendering', () => {
  it('mean-calc prompt contains "Mean of" + values', () => {
    render([{ skill: 'mean-calc', values: [3, 7, 5, 9], answer: 6 }]);
    expect(capturedTextCalls.some(t => t.includes('Mean of 3, 7, 5, 9?'))).toBe(true);
  });

  it('mean-find-missing prompt masks the unknown with ?', () => {
    render([
      {
        skill: 'mean-find-missing',
        values: [4, 6, 6, 8],
        missingIndex: 2,
        givenMean: 6,
        answer: 6,
      },
    ]);
    expect(capturedTextCalls.some(t => t.includes('Mean of 4, 6, ?, 8 is 6'))).toBe(true);
  });

  it('median / mode / range render expected prompts', () => {
    capturedTextCalls.length = 0;
    render([
      { skill: 'median', values: [3, 7, 1, 9, 5], answer: 5 },
      { skill: 'mode', values: [2, 5, 2, 7, 5, 5, 9], answer: 5 },
      { skill: 'range', values: [3, 7, 1, 9, 5], answer: 8 },
    ]);
    expect(capturedTextCalls.some(t => t.includes('Median of 3, 7, 1, 9, 5'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('Mode of 2, 5, 2, 7, 5, 5, 9'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('Range of 3, 7, 1, 9, 5'))).toBe(true);
  });
});

describe('generateStatsPdf — answer key', () => {
  it('emits "n) value" answers when includeAnswerKey is true', () => {
    render(
      [
        { skill: 'mean-calc', values: [3, 7, 5, 9], answer: 6 },
        { skill: 'median', values: [3, 7, 1, 9, 5], answer: 5 },
        { skill: 'mode', values: [2, 5, 2, 7, 5, 5, 9], answer: 5 },
        { skill: 'range', values: [3, 7, 1, 9, 5], answer: 8 },
      ],
      { includeAnswerKey: true }
    );
    expect(capturedTextCalls).toContain('1) 6');
    expect(capturedTextCalls).toContain('2) 5');
    expect(capturedTextCalls).toContain('3) 5');
    expect(capturedTextCalls).toContain('4) 8');
  });

  it('answerKeyText emits "n) value"', () => {
    const q: StatsQuestion = { skill: 'mean-calc', values: [3, 7, 5, 9], answer: 6 };
    expect(answerKeyText(q, 7)).toBe('7) 6');
  });

  it('does not emit answers when includeAnswerKey is unset', () => {
    render([{ skill: 'mean-calc', values: [3, 7, 5, 9], answer: 6 }]);
    expect(capturedTextCalls.includes('1) 6')).toBe(false);
  });
});

describe('generateStatsPdf — encoding safety', () => {
  const baseSettings: StatsSettings = {
    skills: ALL_SKILLS,
    difficulty: 'hard',
    gameMode: 'questions',
    questionCount: 20,
    timeLimit: 0,
  };

  it('no Mathematical Operators block chars in any text call', () => {
    capturedTextCalls.length = 0;
    const qs = generateStatsQuestions(baseSettings, 60);
    render(qs, { includeAnswerKey: true });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe in "${t}"`).toBe(false);
    });
  });

  it('no U+2212 mathematical minus is emitted', () => {
    capturedTextCalls.length = 0;
    const qs = generateStatsQuestions(baseSettings, 40);
    render(qs);
    capturedTextCalls.forEach(t => expect(t.includes('−')).toBe(false));
  });
});

describe('generateStatsPdf — multi-page', () => {
  it('continuous question numbering across pages', () => {
    capturedTextCalls.length = 0;
    generateStatsPdf({
      pages: [
        [{ skill: 'mean-calc', values: [2, 4, 6], answer: 4 }],
        [{ skill: 'mean-calc', values: [1, 3, 5], answer: 3 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls.some(t => t.startsWith('1.  '))).toBe(true);
    expect(capturedTextCalls.some(t => t.startsWith('2.  '))).toBe(true);
  });
});

describe('generateStatsPdf — header / name', () => {
  it('renders title and "Name:" label', () => {
    render([{ skill: 'mean-calc', values: [2, 4, 6], answer: 4 }]);
    expect(capturedTextCalls).toContain('Maths Challenge - Statistics');
    expect(capturedTextCalls).toContain('Name:');
  });

  it('renders studentName when provided', () => {
    capturedTextCalls.length = 0;
    generateStatsPdf({
      pages: [[{ skill: 'mean-calc', values: [2, 4, 6], answer: 4 }]],
      title: 'T',
      subtitle: '',
      studentName: 'Jess',
    });
    expect(capturedTextCalls).toContain('Jess');
  });
});

describe('generateStatsPdf — end-to-end round-trip', () => {
  it('every generated question prompt appears in the PDF', () => {
    capturedTextCalls.length = 0;
    const qs = generateStatsQuestions(
      {
        skills: ALL_SKILLS,
        difficulty: 'easy',
        gameMode: 'questions',
        questionCount: 30,
        timeLimit: 0,
      },
      30
    );
    render(qs);
    qs.forEach(q => {
      const text = capturedTextCalls.join('|');
      // Each question's value-list should appear somewhere in the PDF.
      const valuesPart = q.values.join(', ');
      expect(text.includes(valuesPart) || text.includes('?')).toBe(true);
    });
  });
});
