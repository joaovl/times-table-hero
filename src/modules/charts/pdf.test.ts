import { describe, it, expect, beforeEach, vi } from 'vitest';

const { capturedTextCalls, capturedRects, capturedLines } = vi.hoisted(() => ({
  capturedTextCalls: [] as string[],
  capturedRects: [] as Array<{ x: number; y: number; w: number; h: number }>,
  capturedLines: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
}));

vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setLineWidth() {}
    setDrawColor() {}
    setFillColor() {}
    line(x1: number, y1: number, x2: number, y2: number) {
      capturedLines.push({ x1, y1, x2, y2 });
    }
    rect(x: number, y: number, w: number, h: number) {
      capturedRects.push({ x, y, w, h });
    }
    circle() {}
    addPage() {}
    save() {}
    output() {
      return '';
    }
    getTextWidth(s: string) {
      return s.length * 2;
    }
    splitTextToSize(text: string) {
      return [text];
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

import { generateChartsPdf } from './pdf';
import { generateChartQuestions } from './logic';
import type { ChartQuestion, ChartSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
  capturedRects.length = 0;
  capturedLines.length = 0;
});

// Unicode Math Operators block (U+2200..U+22FF). No char in this block is
// in Helvetica's WinAnsi encoding — would mis-render in jsPDF.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

const sampleQuestion = (over: Partial<ChartQuestion> = {}): ChartQuestion => ({
  skill: 'read-bar',
  categories: [
    { label: 'Mon', value: 5 },
    { label: 'Tue', value: 8 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 11 },
    { label: 'Fri', value: 6 },
  ],
  targets: [1],
  prompt: 'How many votes did Tue get?',
  answer: 8,
  unit: 'votes',
  ...over,
});

const render = (qs: ChartQuestion[]) =>
  generateChartsPdf({ pages: [qs], title: 'Test', subtitle: '' });

describe('generateChartsPdf — question numbering', () => {
  it('renders "1." for a single question', () => {
    render([sampleQuestion()]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('numbers continue across multiple pages', () => {
    generateChartsPdf({
      pages: [[sampleQuestion()], [sampleQuestion()]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });

  it('renders question numbers for every cell in a multi-question page', () => {
    render([sampleQuestion(), sampleQuestion(), sampleQuestion(), sampleQuestion()]);
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
    expect(capturedTextCalls).toContain('3.');
    expect(capturedTextCalls).toContain('4.');
  });
});

describe('generateChartsPdf — prompt rendering', () => {
  it('renders the prompt text for a single question', () => {
    render([sampleQuestion({ prompt: 'How many votes did Tue get?' })]);
    expect(capturedTextCalls).toContain('How many votes did Tue get?');
  });

  it('renders distinct prompts across cells', () => {
    render([
      sampleQuestion({ prompt: 'Question A?' }),
      sampleQuestion({ prompt: 'Question B?' }),
    ]);
    expect(capturedTextCalls).toContain('Question A?');
    expect(capturedTextCalls).toContain('Question B?');
  });
});

describe('generateChartsPdf — bars and axes (primitives)', () => {
  it('draws at least one rect per category bar', () => {
    const q = sampleQuestion();
    render([q]);
    // At least one rect per bar (no header rects).
    expect(capturedRects.length).toBeGreaterThanOrEqual(q.categories.length);
  });

  it('draws gridlines, axes, name underline, and answer line — all via lines', () => {
    render([sampleQuestion()]);
    // gridlines + y-axis + x-axis + name underline + header rule + answer line + footer
    // Comfortable lower bound.
    expect(capturedLines.length).toBeGreaterThan(6);
  });

  it('every category label appears in captured text', () => {
    const q = sampleQuestion();
    render([q]);
    for (const c of q.categories) {
      expect(capturedTextCalls).toContain(c.label);
    }
  });

  it('y-axis numeric labels are emitted (axisMax-rounded integers)', () => {
    render([sampleQuestion({
      categories: [
        { label: 'A', value: 5 }, { label: 'B', value: 6 },
        { label: 'C', value: 7 }, { label: 'D', value: 8 },
      ],
    })]);
    // For dataMax=8, axisMax=8 (rounded up to nearest 2). Should include '0'.
    expect(capturedTextCalls).toContain('0');
  });
});

describe('generateChartsPdf — answer key', () => {
  it('does not include answers when includeAnswerKey is unset', () => {
    render([sampleQuestion({ answer: 8 })]);
    expect(capturedTextCalls).not.toContain('1) 8');
  });

  it('single question answer renders in the answer key', () => {
    generateChartsPdf({
      pages: [[sampleQuestion({ answer: 8 })]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 8');
    expect(capturedTextCalls).toContain('Test — Answer Key');
  });

  it('continuous numbering across pages in the answer key', () => {
    generateChartsPdf({
      pages: [
        [sampleQuestion({ answer: 12 }), sampleQuestion({ answer: 4 })],
        [sampleQuestion({ answer: 47 })],
      ],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 12');
    expect(capturedTextCalls).toContain('2) 4');
    expect(capturedTextCalls).toContain('3) 47');
  });
});

describe('generateChartsPdf — encoding safety', () => {
  it('no Math Operators block chars on a single page', () => {
    render([sampleQuestion()]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across a full generated worksheet', () => {
    const settings: ChartSettings = {
      skills: ['read-bar', 'compare-bar', 'total-bar'],
      maxValue: 100,
      numCategories: 7,
      gameMode: 'questions',
      questionCount: 10,
      timeLimit: 0,
    };
    const qs = generateChartQuestions(settings, 10);
    generateChartsPdf({
      pages: [qs],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });
});

describe('generateChartsPdf — round-trip', () => {
  it('every generated answer appears in the answer key in order', () => {
    const settings: ChartSettings = {
      skills: ['read-bar'],
      maxValue: 50,
      numCategories: 5,
      gameMode: 'questions',
      questionCount: 8,
      timeLimit: 0,
    };
    const qs = generateChartQuestions(settings, 8);
    generateChartsPdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    qs.forEach((q, i) => {
      expect(capturedTextCalls).toContain(`${i + 1}) ${q.answer}`);
    });
  });

  it('exhaustive: every (skill x numCategories) combo renders without unsafe chars', () => {
    const skills: Array<'read-bar' | 'compare-bar' | 'total-bar'> = [
      'read-bar',
      'compare-bar',
      'total-bar',
    ];
    const numCats = [4, 5, 6, 7];
    let combos = 0;
    for (const skill of skills) {
      for (const n of numCats) {
        combos++;
        capturedTextCalls.length = 0;
        capturedRects.length = 0;
        capturedLines.length = 0;
        const settings: ChartSettings = {
          skills: [skill],
          maxValue: 100,
          numCategories: n,
          gameMode: 'questions',
          questionCount: 6,
          timeLimit: 0,
        };
        const qs = generateChartQuestions(settings, 6);
        generateChartsPdf({
          pages: [qs],
          title: 'T',
          subtitle: '',
          includeAnswerKey: true,
        });
        // At least n bars per question.
        expect(capturedRects.length).toBeGreaterThanOrEqual(qs.length * n);
        capturedTextCalls.forEach(t => {
          expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}" (skill=${skill}, n=${n})`).toBe(false);
        });
        qs.forEach((q, i) => {
          expect(capturedTextCalls).toContain(`${i + 1}) ${q.answer}`);
        });
      }
    }
    expect(combos).toBe(12);
  });
});
