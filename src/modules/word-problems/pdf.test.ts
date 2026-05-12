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

import { generateWordPdf } from './pdf';
import { generateWordQuestions } from './logic';
import type { WordProblemSkill, WordQuestion, WordSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: WordQuestion[]) =>
  generateWordPdf({ pages: [qs], title: 'Test', subtitle: '' });

// Regex matching any character in the Unicode Mathematical Operators block
// (U+2200..U+22FF). No char in this block is in Helvetica's WinAnsi
// encoding, so any such char passed to doc.text() will mis-render.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

// WinAnsi-safe character whitelist for word-problem prompts. WinAnsi covers
// ASCII (0x20..0x7E) plus a handful of Latin-1 / extended characters we
// actually use: £ (£), ° (°), ² (²), ³ (³), ×, ÷,
// non-breaking space ( ). We allow tab/newline defensively too, but
// the codepath shouldn't emit them.
const WINANSI_SAFE = /^[\x20-\x7E£°²³×÷ \t\n\r]*$/;

describe('generateWordPdf — question numbering and header', () => {
  it('writes the title and a numbered prompt', () => {
    generateWordPdf({
      pages: [
        [
          {
            skill: 'arith-1step',
            prompt: 'Sam has 12 apples. He gives 5 away. How many left?',
            answer: 7,
          },
        ],
      ],
      title: 'Maths Challenge - Word Problems',
      subtitle: 'easy',
    });
    expect(capturedTextCalls).toContain('Maths Challenge - Word Problems');
    expect(capturedTextCalls).toContain('1. ');
    expect(
      capturedTextCalls.some(t => t.includes('Sam has 12 apples'))
    ).toBe(true);
  });

  it('numbers continue across pages', () => {
    generateWordPdf({
      pages: [
        [{ skill: 'arith-1step', prompt: 'P1', answer: 1 }],
        [{ skill: 'arith-1step', prompt: 'P2', answer: 2 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1. ');
    expect(capturedTextCalls).toContain('2. ');
  });
});

describe('generateWordPdf — answer key', () => {
  it('omits the answer page when includeAnswerKey is unset', () => {
    generateWordPdf({
      pages: [[{ skill: 'arith-1step', prompt: 'P', answer: 7 }]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).not.toContain('1) 7');
    expect(capturedTextCalls.some(t => t.includes('Answer Key'))).toBe(false);
  });

  it('appends the answer key when includeAnswerKey is true', () => {
    generateWordPdf({
      pages: [
        [
          { skill: 'arith-1step', prompt: 'P1', answer: 7 },
          {
            skill: 'measure-1step',
            prompt: 'P2',
            answer: 18,
            unit: 'cm',
          },
          {
            skill: 'money-1step',
            prompt: 'P3',
            answer: '£3.50',
          },
          {
            skill: 'fractions-1step',
            prompt: 'P4',
            answer: '5/8',
          },
        ],
      ],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 7');
    expect(capturedTextCalls).toContain('2) 18 cm');
    expect(capturedTextCalls).toContain('3) £3.50');
    expect(capturedTextCalls).toContain('4) 5/8');
    expect(capturedTextCalls).toContain('Maths - Answer Key');
  });
});

describe('generateWordPdf — encoding safety', () => {
  it('every text() call is in the WinAnsi-safe character set', () => {
    const skills: WordProblemSkill[] = [
      'arith-1step',
      'arith-2step',
      'money-1step',
      'money-2step',
      'time-1step',
      'measure-1step',
      'measure-2step',
      'fractions-1step',
    ];
    const diffs: Array<WordSettings['difficulty']> = ['easy', 'medium', 'hard'];

    for (const skill of skills) {
      for (const difficulty of diffs) {
        capturedTextCalls.length = 0;
        const qs = generateWordQuestions(
          {
            skills: [skill],
            difficulty,
            gameMode: 'questions',
            questionCount: 12,
            timeLimit: 0,
          },
          12
        );
        generateWordPdf({
          pages: [qs],
          title: 'Test',
          subtitle: 'subtitle',
          includeAnswerKey: true,
        });

        capturedTextCalls.forEach(t => {
          expect(
            WINANSI_SAFE.test(t),
            `non-WinAnsi char in "${t}" (skill=${skill} diff=${difficulty})`
          ).toBe(true);
          expect(
            MATH_OPERATORS_BLOCK.test(t),
            `Math-Operators char in "${t}" (skill=${skill} diff=${difficulty})`
          ).toBe(false);
        });
      }
    }
  });

  it('templates never emit the ≈/≤/≥ symbols', () => {
    const qs = generateWordQuestions(
      {
        skills: [
          'arith-1step',
          'arith-2step',
          'money-1step',
          'money-2step',
          'time-1step',
          'measure-1step',
          'measure-2step',
          'fractions-1step',
        ],
        difficulty: 'hard',
        gameMode: 'questions',
        questionCount: 40,
        timeLimit: 0,
      },
      40
    );
    qs.forEach(q => {
      expect(q.prompt.includes('≈')).toBe(false); // ≈
      expect(q.prompt.includes('≤')).toBe(false); // ≤
      expect(q.prompt.includes('≥')).toBe(false); // ≥
      // Templates use ASCII hyphen, never U+2212 math-minus.
      expect(q.prompt.includes('−')).toBe(false);
    });
  });

  it('every generated prompt and answer survives PDF encoding check', () => {
    const qs = generateWordQuestions(
      {
        skills: [
          'arith-1step',
          'arith-2step',
          'money-1step',
          'money-2step',
          'time-1step',
          'measure-1step',
          'measure-2step',
          'fractions-1step',
        ],
        difficulty: 'medium',
        gameMode: 'questions',
        questionCount: 24,
        timeLimit: 0,
      },
      24
    );
    qs.forEach(q => {
      expect(WINANSI_SAFE.test(q.prompt)).toBe(true);
      const answerStr =
        typeof q.answer === 'string' ? q.answer : `${q.answer}${q.unit ? ' ' + q.unit : ''}`;
      expect(WINANSI_SAFE.test(answerStr)).toBe(true);
    });
  });
});

describe('generateWordPdf — does not leak answer on question page', () => {
  it('numeric answer not present as standalone text on the question page', () => {
    const q: WordQuestion = {
      skill: 'arith-1step',
      prompt: 'How many?',
      answer: 42,
    };
    render([q]);
    // The answer 42 should never appear as a bare text call on the question
    // page. The prompt is "How many?" — no 42 anywhere.
    expect(capturedTextCalls.includes('42')).toBe(false);
  });

  it('money answer not present on the question page when no answer key is requested', () => {
    const q: WordQuestion = {
      skill: 'money-1step',
      prompt: 'How much change?',
      answer: '£5.50',
    };
    render([q]);
    expect(capturedTextCalls.includes('£5.50')).toBe(false);
  });
});

describe('generateWordPdf — round-trip with generateWordQuestions', () => {
  it('every prompt appears in the rendered PDF (no silent drops at 6/page)', () => {
    const qs = generateWordQuestions(
      {
        skills: ['arith-1step', 'money-1step'],
        difficulty: 'easy',
        gameMode: 'questions',
        questionCount: 6,
        timeLimit: 0,
      },
      6
    );
    render(qs);
    qs.forEach(q => {
      // The prompt may wrap, but the FakeJsPDF doesn't implement
      // splitTextToSize, so our wrap() falls back to a simple word splitter.
      // The first word of the prompt should at least appear in some text call.
      const firstWord = q.prompt.split(/\s+/)[0];
      expect(
        capturedTextCalls.some(t => t.includes(firstWord)),
        `prompt starting "${firstWord}" missing from PDF`
      ).toBe(true);
    });
  });
});
