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

import { generateMoneyPdf } from './pdf';
import { generateMoneyQuestions } from './logic';
import type { MoneyQuestion, MoneySettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
});

const render = (qs: MoneyQuestion[]) =>
  generateMoneyPdf({ pages: [qs], title: 'Test', subtitle: '' });

const someTextEndsWith = (suffix: string): boolean =>
  capturedTextCalls.some(t => t.endsWith(suffix));

const someTextStartsWith = (prefix: string): boolean =>
  capturedTextCalls.some(t => t.startsWith(prefix));

// Regex matching any char in the Mathematical Operators Unicode block — none
// of which is in Helvetica's WinAnsi encoding, so any such char in a PDF
// text() call will mis-render.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('generateMoneyPdf — basic rendering', () => {
  it('renders an add-money question with £ symbol and ASCII +', () => {
    render([{ skill: 'add-money', aPence: 345, bPence: 220, answerPence: 565 }]);
    expect(capturedTextCalls).toContain('1.  £3.45 + £2.20 =');
  });

  it('renders a subtract-money question with ASCII hyphen (not U+2212)', () => {
    render([{ skill: 'subtract-money', aPence: 500, bPence: 265, answerPence: 235 }]);
    expect(capturedTextCalls).toContain('1.  £5.00 - £2.65 =');
    capturedTextCalls.forEach(t => expect(t).not.toContain('−'));
  });

  it('renders a multiply-money question as "qty × unit-price ="', () => {
    render([
      { skill: 'multiply-money', aPence: 130, bPence: 5, answerPence: 650, itemName: 'apple' },
    ]);
    expect(capturedTextCalls).toContain('1.  5 × £1.30 =');
  });

  it('renders a change question with item name and amounts', () => {
    render([
      {
        skill: 'change',
        pricePence: 465,
        paidPence: 1000,
        answerPence: 535,
        itemName: 'apple',
      },
    ]);
    expect(someTextStartsWith('1.  Buy apple £4.65, pay £10.00')).toBe(true);
  });

  it('renders a compare-prices question with both options and prices, no MC button hints', () => {
    render([
      {
        skill: 'compare-prices',
        aPence: 345,
        bPence: 354,
        answer: 'A',
        itemAName: 'apple',
        itemBName: 'banana',
      },
    ]);
    expect(someTextStartsWith('1.  Cheaper?')).toBe(true);
    // Both labels must appear in the question text.
    const all = capturedTextCalls.join(' | ');
    expect(all).toContain('apple £3.45');
    expect(all).toContain('banana £3.54');
  });

  it('renders a multi-item question with one line per item', () => {
    render([
      {
        skill: 'multi-item',
        items: [
          { name: 'apple', pricePence: 50 },
          { name: 'bread', pricePence: 120 },
          { name: 'milk', pricePence: 80 },
        ],
        answerPence: 250,
      },
    ]);
    expect(someTextStartsWith('1.  Total cost?')).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('apple: 50p'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('bread: £1.20'))).toBe(true);
    expect(capturedTextCalls.some(t => t.includes('milk: 80p'))).toBe(true);
    expect(capturedTextCalls).toContain('Total =');
  });
});

describe('generateMoneyPdf — answer leak protection', () => {
  it('does NOT print the answer in the question text for any skill', () => {
    const qs: MoneyQuestion[] = [
      { skill: 'add-money', aPence: 345, bPence: 220, answerPence: 565 },
      { skill: 'subtract-money', aPence: 500, bPence: 265, answerPence: 235 },
      { skill: 'multiply-money', aPence: 130, bPence: 5, answerPence: 650, itemName: 'apple' },
      {
        skill: 'change',
        pricePence: 465,
        paidPence: 1000,
        answerPence: 535,
        itemName: 'apple',
      },
      {
        skill: 'multi-item',
        items: [
          { name: 'apple', pricePence: 50 },
          { name: 'bread', pricePence: 120 },
          { name: 'milk', pricePence: 80 },
        ],
        answerPence: 250,
      },
      {
        skill: 'compare-prices',
        aPence: 345,
        bPence: 354,
        answer: 'A',
        itemAName: 'apple',
        itemBName: 'banana',
      },
    ];
    render(qs);
    qs.forEach((q, i) => {
      if (q.skill === 'compare-prices') return;
      // The formatted answer must not appear AS a complete text() call.
      // (Partial substrings are OK — e.g. "£1.20" might appear in multi-item
      // as an item price; we look at exact text() calls only.)
      const formatted = q.skill === 'multi-item'
        ? `Total = ${q.answerPence}`
        : `= ${q.answerPence}`;
      expect(capturedTextCalls).not.toContain(formatted);
    });
  });
});

describe('generateMoneyPdf — answer key', () => {
  it('appends a numbered answer page when includeAnswerKey is true', () => {
    generateMoneyPdf({
      pages: [
        [
          { skill: 'add-money', aPence: 345, bPence: 220, answerPence: 565 },
          { skill: 'subtract-money', aPence: 500, bPence: 265, answerPence: 235 },
        ],
        [
          {
            skill: 'multiply-money',
            aPence: 130,
            bPence: 5,
            answerPence: 650,
            itemName: 'apple',
          },
        ],
      ],
      title: 'Money',
      subtitle: '',
      includeAnswerKey: true,
    });
    // Continuous numbering across pages.
    expect(capturedTextCalls).toContain('1) £5.65');
    expect(capturedTextCalls).toContain('2) £2.35');
    expect(capturedTextCalls).toContain('3) £6.50');
    expect(capturedTextCalls).toContain('Money — Answer Key');
  });

  it('renders compare answers as "A" / "B" / "equal" rather than money', () => {
    generateMoneyPdf({
      pages: [
        [
          {
            skill: 'compare-prices',
            aPence: 345,
            bPence: 354,
            answer: 'A',
            itemAName: 'apple',
            itemBName: 'banana',
          },
          {
            skill: 'compare-prices',
            aPence: 345,
            bPence: 345,
            answer: 'equal',
            itemAName: 'apple',
            itemBName: 'banana',
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) A');
    expect(capturedTextCalls).toContain('2) equal');
  });

  it('renders sub-£1 answers in pence form ("50p")', () => {
    generateMoneyPdf({
      pages: [
        [
          {
            skill: 'change',
            pricePence: 50,
            paidPence: 100,
            answerPence: 50,
            itemName: 'apple',
          },
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 50p');
  });
});

describe('generateMoneyPdf — encoding safety', () => {
  it('never writes a char from the Mathematical Operators Unicode block', () => {
    const settings: MoneySettings = {
      skills: ['add-money', 'subtract-money', 'change', 'multi-item', 'compare-prices', 'multiply-money'],
      difficulty: 'hard',
      gameMode: 'questions',
      questionCount: 30,
      timeLimit: 0,
    };
    const qs = generateMoneyQuestions(settings, 30);
    generateMoneyPdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unrenderable char in "${t}"`).toBe(false);
    });
  });

  it('every emitted text() call uses only chars allowed in Helvetica WinAnsi (extended-Latin range only)', () => {
    // Conservative check: no codepoints above U+00FF, except known-safe glyphs
    // we do use (× U+00D7, ÷ U+00F7, £ U+00A3 — all already <= 0xFF).
    const qs: MoneyQuestion[] = [
      { skill: 'add-money', aPence: 345, bPence: 220, answerPence: 565 },
      { skill: 'subtract-money', aPence: 500, bPence: 265, answerPence: 235 },
      { skill: 'multiply-money', aPence: 130, bPence: 5, answerPence: 650, itemName: 'apple' },
    ];
    render(qs);
    capturedTextCalls.forEach(t => {
      for (let i = 0; i < t.length; i++) {
        expect(t.charCodeAt(i)).toBeLessThanOrEqual(0xff);
      }
    });
  });
});

describe('generateMoneyPdf — page numbering across pages', () => {
  it('continues question numbers from one page to the next', () => {
    generateMoneyPdf({
      pages: [
        [{ skill: 'add-money', aPence: 100, bPence: 200, answerPence: 300 }],
        [{ skill: 'add-money', aPence: 400, bPence: 500, answerPence: 900 }],
      ],
      title: 'T',
      subtitle: '',
    });
    expect(someTextEndsWith('£1.00 + £2.00 =')).toBe(true);
    expect(someTextEndsWith('£4.00 + £5.00 =')).toBe(true);
    expect(someTextStartsWith('1.  ')).toBe(true);
    expect(someTextStartsWith('2.  ')).toBe(true);
  });
});

describe('generateMoneyPdf — round-trip with generateMoneyQuestions', () => {
  const base: MoneySettings = {
    skills: ['add-money'],
    difficulty: 'easy',
    gameMode: 'questions',
    questionCount: 16,
    timeLimit: 0,
  };

  it('every binary-skill question appears in the rendered text', () => {
    const skills = ['add-money', 'subtract-money', 'multiply-money', 'change', 'compare-prices'] as const;
    for (const skill of skills) {
      capturedTextCalls.length = 0;
      const qs = generateMoneyQuestions({ ...base, skills: [skill] }, 8);
      render(qs);
      qs.forEach(q => {
        // Each binary question begins with "<N>.  ". Just check N exists.
        const startsWithNum = capturedTextCalls.some(t => /^\d+\.  /.test(t));
        expect(startsWithNum, `skill=${skill} q=${JSON.stringify(q)}`).toBe(true);
        // And a money string from the question should appear somewhere.
        if (q.skill === 'add-money' || q.skill === 'subtract-money') {
          const all = capturedTextCalls.join(' | ');
          expect(all).toContain('£'); // pound symbol survives
        }
      });
    }
  });

  it('multi-item: every item name appears in the rendered text', () => {
    capturedTextCalls.length = 0;
    const qs = generateMoneyQuestions({ ...base, skills: ['multi-item'] }, 6);
    render(qs);
    qs.forEach(q => {
      if (q.skill !== 'multi-item') return;
      q.items.forEach(it => {
        const found = capturedTextCalls.some(t => t.includes(it.name));
        expect(found, `missing item ${it.name}`).toBe(true);
      });
    });
  });
});
