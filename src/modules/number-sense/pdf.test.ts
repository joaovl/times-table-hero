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
      // Slightly wider than arithmetic's fake so wrapping kicks in for the
      // longest prompts (Roman / order-numbers).
      return s.length * 1.6;
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

import { generateNumberSensePdf, answerKeyText } from './pdf';
import { generateNumberSenseQuestions, ALL_SKILLS } from './logic';
import type {
  NumberSenseQuestion,
  NumberSenseSettings,
  NumberSensePlaceValueQuestion,
  NumberSenseRoundQuestion,
  NumberSenseSequenceQuestion,
  NumberSenseRomanQuestion,
  NumberSenseOrderQuestion,
} from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: NumberSenseQuestion[]) =>
  generateNumberSensePdf({ pages: [qs], title: 'Test', subtitle: '' });

// Mirror the encoding-safety guard used by the arithmetic module: any
// character in U+2200..U+22FF will mis-render in Helvetica's WinAnsi
// encoding. Number Sense uses only ASCII letters, digits, basic
// punctuation, and en-dash/comma — none in this block.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

const someTextIncludes = (substr: string): boolean =>
  capturedTextCalls.some(t => t.includes(substr));

describe('generateNumberSensePdf — basic rendering', () => {
  it('renders place-value prompts with the number visible', () => {
    const q: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    render([q]);
    expect(someTextIncludes('374')).toBe(true);
    // Answer must not leak into the on-page form.
    expect(capturedTextCalls.some(t => t === '70')).toBe(false);
  });

  it('renders round prompts with the number visible', () => {
    const q: NumberSenseRoundQuestion = {
      skill: 'round-100',
      number: 347,
      nearest: 100,
      answer: 300,
    };
    render([q]);
    // Number is formatted with en-GB thousands separator (no separator below 1000).
    expect(someTextIncludes('347')).toBe(true);
    expect(someTextIncludes('100')).toBe(true);
  });

  it('renders sequence questions with blanks shown as ___', () => {
    const q: NumberSenseSequenceQuestion = {
      skill: 'count-multiples',
      sequence: [8, 16, 24, 32, 40, 48],
      missingIndices: [3, 4],
      answers: [32, 40],
      step: 8,
    };
    render([q]);
    // Visible terms appear; blanks appear as triple underscore in the prompt.
    expect(someTextIncludes('8')).toBe(true);
    expect(someTextIncludes('16')).toBe(true);
    expect(someTextIncludes('___')).toBe(true);
    // Answers don't leak.
    expect(capturedTextCalls.some(t => t === '32')).toBe(false);
    expect(capturedTextCalls.some(t => t === '40')).toBe(false);
  });

  it('renders Roman r2n prompts (Roman → number) with the Roman string', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'r2n',
      prompt: 'XIV',
      answer: '14',
    };
    render([q]);
    expect(someTextIncludes('XIV')).toBe(true);
    expect(capturedTextCalls.some(t => t === '14')).toBe(false);
  });

  it('renders Roman n2r prompts (number → Roman)', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'n2r',
      prompt: '14',
      answer: 'XIV',
    };
    render([q]);
    expect(someTextIncludes('14')).toBe(true);
    // Answer (XIV) must not appear on the worksheet itself.
    expect(capturedTextCalls.some(t => t === 'XIV')).toBe(false);
  });

  it('renders order-numbers prompts with all four numbers', () => {
    const q: NumberSenseOrderQuestion = {
      skill: 'order-numbers',
      numbers: [847, 84, 219, 502],
      answer: [84, 219, 502, 847],
    };
    render([q]);
    [847, 84, 219, 502].forEach(n => {
      expect(someTextIncludes(String(n))).toBe(true);
    });
  });
});

describe('generateNumberSensePdf — answer key', () => {
  it('does not include answers when includeAnswerKey is unset', () => {
    const q: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    generateNumberSensePdf({ pages: [[q]], title: 'T', subtitle: '' });
    expect(capturedTextCalls).not.toContain('1) 70');
  });

  it('appends a numbered answer page when includeAnswerKey is true', () => {
    const pv: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    const seq: NumberSenseSequenceQuestion = {
      skill: 'count-multiples',
      sequence: [8, 16, 24, 32, 40, 48],
      missingIndices: [3, 4],
      answers: [32, 40],
      step: 8,
    };
    const ro: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'n2r',
      prompt: '14',
      answer: 'XIV',
    };
    generateNumberSensePdf({
      pages: [[pv, seq, ro]],
      title: 'Numbers',
      subtitle: '',
      includeAnswerKey: true,
    });
    // Continuous numbering across pages.
    expect(someTextIncludes('1) 70')).toBe(true);
    expect(someTextIncludes('2) 32, 40')).toBe(true);
    expect(someTextIncludes('3) XIV')).toBe(true);
    // Answer key has its own header
    expect(someTextIncludes('Numbers — Answer Key')).toBe(true);
  });

  it('formats sequence answers as comma-separated', () => {
    const q: NumberSenseSequenceQuestion = {
      skill: 'count-multiples',
      sequence: [8, 16, 24, 32, 40, 48],
      missingIndices: [3, 4],
      answers: [32, 40],
      step: 8,
    };
    expect(answerKeyText(q, 1)).toBe('1) 32, 40');
  });

  it('formats Roman answers as the Roman string', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'n2r',
      prompt: '14',
      answer: 'XIV',
    };
    expect(answerKeyText(q, 1)).toBe('1) XIV');
  });

  it('formats order-numbers answers comma-separated, smallest first', () => {
    const q: NumberSenseOrderQuestion = {
      skill: 'order-numbers',
      numbers: [847, 84, 219, 502],
      answer: [84, 219, 502, 847],
    };
    expect(answerKeyText(q, 5)).toBe('5) 84, 219, 502, 847');
  });
});

describe('generateNumberSensePdf — question numbering continues across pages', () => {
  it('continuous numbering 1..N in answer key', () => {
    const pages: NumberSenseQuestion[][] = [
      [
        { skill: 'place-value-3d', number: 374, digitIndex: 1, answer: 70 },
        { skill: 'place-value-3d', number: 482, digitIndex: 0, answer: 400 },
      ],
      [
        { skill: 'round-100', number: 347, nearest: 100, answer: 300 },
      ],
    ];
    generateNumberSensePdf({ pages, title: 'T', subtitle: '', includeAnswerKey: true });
    expect(someTextIncludes('1) 70')).toBe(true);
    expect(someTextIncludes('2) 400')).toBe(true);
    expect(someTextIncludes('3) 300')).toBe(true);
  });
});

describe('generateNumberSensePdf — encoding safety (Helvetica WinAnsi)', () => {
  // The same regex test the arithmetic module uses to catch chars outside
  // Helvetica's WinAnsi encoding. Roman numerals and digits are all ASCII;
  // commas, hyphens, periods are WinAnsi-safe; the en-GB locale uses ASCII
  // comma as thousands separator so even 1,000,000 is safe.
  it('every skill * difficulty combination emits only WinAnsi-safe characters', () => {
    const diffs: NumberSenseSettings['difficulty'][] = ['easy', 'medium', 'hard'];
    for (const skill of ALL_SKILLS) {
      for (const difficulty of diffs) {
        capturedTextCalls.length = 0;
        const qs = generateNumberSenseQuestions(
          {
            skills: [skill],
            difficulty,
            gameMode: 'questions',
            questionCount: 10,
            timeLimit: 0,
          },
          10
        );
        render(qs);
        capturedTextCalls.forEach(t => {
          expect(
            MATH_OPERATORS_BLOCK.test(t),
            `unrenderable char in "${t}" (skill=${skill} difficulty=${difficulty})`
          ).toBe(false);
        });
      }
    }
  });

  it('end-to-end: multi-skill batch + answer key produces only safe characters', () => {
    capturedTextCalls.length = 0;
    const settings: NumberSenseSettings = {
      skills: [...ALL_SKILLS],
      difficulty: 'medium',
      gameMode: 'questions',
      questionCount: 30,
      timeLimit: 0,
    };
    const pages = [
      generateNumberSenseQuestions(settings, 30),
      generateNumberSenseQuestions(settings, 30),
    ];
    generateNumberSensePdf({
      pages,
      title: 'Maths — Number Sense',
      subtitle: 'all skills',
      studentName: 'Test',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
    // Sanity: rendered enough content.
    expect(capturedTextCalls.length).toBeGreaterThan(50);
  });
});

describe('generateNumberSensePdf — no answer leaks on the worksheet', () => {
  it('place-value answer never appears as its own text() call on the worksheet', () => {
    capturedTextCalls.length = 0;
    const q: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    // No answer key — answer should not be in the captured text at all.
    generateNumberSensePdf({ pages: [[q]], title: 'T', subtitle: '' });
    // Answer must not appear as the only content of a text call.
    expect(capturedTextCalls.some(t => t === '70')).toBe(false);
    // And the "1) 70" answer-key form must not appear either.
    expect(capturedTextCalls.some(t => t === '1) 70')).toBe(false);
  });
});
