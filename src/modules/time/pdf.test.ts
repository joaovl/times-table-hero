import { describe, it, expect, beforeEach, vi } from 'vitest';

const { capturedTextCalls, capturedCircles, capturedLines } = vi.hoisted(() => ({
  capturedTextCalls: [] as string[],
  capturedCircles: [] as Array<{ x: number; y: number; r: number }>,
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
    circle(x: number, y: number, r: number) {
      capturedCircles.push({ x, y, r });
    }
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

import { generateTimePdf } from './pdf';
import { generateTimeQuestions, expectedAnswerString } from './logic';
import type {
  TimeQuestion,
  TimeReadQuestion,
  TimeArithQuestion,
  TimeSettings,
} from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
  capturedCircles.length = 0;
  capturedLines.length = 0;
});

const render = (qs: TimeQuestion[]) =>
  generateTimePdf({ pages: [qs], title: 'Test', subtitle: '' });

// Unicode Math Operators block (U+2200..U+22FF). No char in this block is
// in Helvetica's WinAnsi encoding — would mis-render in jsPDF.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

const q12h = (hours: number, minutes: number): TimeReadQuestion => ({
  skill: 'read',
  hours,
  minutes,
  answer12h: `${((hours % 12) || 12)}:${minutes.toString().padStart(2, '0')}`,
  answer24h: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
  format: '12h',
});

const q24h = (hours: number, minutes: number): TimeReadQuestion => ({
  skill: 'read',
  hours,
  minutes,
  answer12h: `${((hours % 12) || 12)}:${minutes.toString().padStart(2, '0')}`,
  answer24h: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
  format: '24h',
});

// Helper to build a TimeArithQuestion with sensible defaults.
const arith = (over: Partial<TimeArithQuestion>): TimeArithQuestion => ({
  skill: 'arith',
  startHour: 3,
  startMinute: 45,
  deltaMinutes: 20,
  sign: '+',
  format: '12h',
  answer: '4:05 AM',
  resultHour: 4,
  resultMinute: 5,
  crossesMidnight: false,
  ...over,
});

const baseSettings = (over: Partial<TimeSettings>): TimeSettings => ({
  skills: ['read'],
  precisions: ['hour'],
  format: '12h',
  arithDifficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 0,
  ...over,
});

describe('generateTimePdf — question numbering', () => {
  it('renders "1." for a single question', () => {
    render([q12h(3, 45)]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('numbers continue across multiple pages', () => {
    generateTimePdf({
      pages: [[q12h(3, 45)], [q12h(7, 0)]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });

  it('renders the question number for each clock in a multi-question page', () => {
    render([q12h(1, 0), q12h(2, 0), q12h(3, 0), q12h(4, 0)]);
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
    expect(capturedTextCalls).toContain('3.');
    expect(capturedTextCalls).toContain('4.');
  });
});

describe('generateTimePdf — clock primitives (read-clock)', () => {
  it('draws at least one circle (the face) for every question', () => {
    render([q12h(3, 45), q12h(6, 0), q12h(9, 30)]);
    // Each clock has at least face + center pin = 2 circles. With 3
    // questions, expect at least 6.
    expect(capturedCircles.length).toBeGreaterThanOrEqual(6);
  });

  it('draws lines for ticks and hands (no html2canvas, only primitives)', () => {
    render([q12h(3, 45)]);
    // 12 hour ticks + 2 hands + page chrome (name underline, header rule,
    // answer line) → comfortably > 14.
    expect(capturedLines.length).toBeGreaterThan(14);
  });

  it('renders hour numerals 1..12 around each clock face', () => {
    render([q12h(3, 45)]);
    for (let h = 1; h <= 12; h++) {
      expect(capturedTextCalls).toContain(String(h));
    }
  });
});

describe('generateTimePdf — answer key (read-clock)', () => {
  it('does not include answer strings when includeAnswerKey is unset', () => {
    render([q12h(3, 45)]);
    expect(capturedTextCalls).not.toContain('1) 3:45');
  });

  it('single question renders its time via the answer key (12h)', () => {
    generateTimePdf({
      pages: [[q12h(3, 45)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 3:45');
  });

  it('answer key shows the 24h string for 24h-format questions', () => {
    generateTimePdf({
      pages: [[q24h(14, 30)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 14:30');
  });

  it('continuous numbering across pages in the answer key', () => {
    generateTimePdf({
      pages: [
        [q12h(3, 45), q12h(9, 0)],
        [q24h(14, 30)],
      ],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 3:45');
    expect(capturedTextCalls).toContain('2) 9:00');
    expect(capturedTextCalls).toContain('3) 14:30');
    expect(capturedTextCalls).toContain('Maths — Answer Key');
  });
});

describe('generateTimePdf — time-arith rendering', () => {
  it('renders the equation text for an arith question', () => {
    render([arith({})]);
    expect(capturedTextCalls).toContain('3:45 AM + 20 minutes =');
  });

  it('does NOT draw a clock figure for an arith cell', () => {
    // Read-clock alone produces ~24+ extra lines per cell (ticks + hands)
    // and 2 circles. Arith-only must produce only the answer-line + chrome.
    render([arith({})]);
    // Two cells worth of clock circles would be 2 (face+pin). For arith-only,
    // expect zero face circles. Page chrome adds zero circles.
    expect(capturedCircles.length).toBe(0);
  });

  it('answer key shows arith result (with AM/PM in 12h mode)', () => {
    generateTimePdf({
      pages: [[arith({})]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 4:05 AM');
  });

  it('answer key shows arith result without AM/PM in 24h mode', () => {
    generateTimePdf({
      pages: [
        [
          arith({
            startHour: 14,
            startMinute: 0,
            deltaMinutes: 30,
            sign: '+',
            format: '24h',
            answer: '14:30',
            resultHour: 14,
            resultMinute: 30,
          }),
        ],
      ],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 14:30');
  });

  it('mixed-skill page: read-clock and arith cells coexist', () => {
    render([q12h(3, 45), arith({})]);
    // Clock primitives from the read cell are present.
    expect(capturedCircles.length).toBeGreaterThanOrEqual(2);
    // Arith equation is also present.
    expect(capturedTextCalls).toContain('3:45 AM + 20 minutes =');
  });
});

describe('generateTimePdf — no answer leak on question pages', () => {
  it("the digital time string never appears in the question page's text", () => {
    // Without includeAnswerKey, the rendered text must NOT contain the
    // expected digital-time answer.
    render([q12h(3, 45)]);
    expect(capturedTextCalls).not.toContain('3:45');
    expect(capturedTextCalls).not.toContain('03:45');
  });

  it("24h answer string never appears on the question page", () => {
    render([q24h(14, 30)]);
    expect(capturedTextCalls).not.toContain('14:30');
    expect(capturedTextCalls).not.toContain('2:30');
  });

  it('arith answer never appears on the question page', () => {
    render([arith({})]);
    expect(capturedTextCalls).not.toContain('4:05 AM');
  });
});

describe('generateTimePdf — encoding safety', () => {
  it('no Math Operators block chars in rendered text (single page)', () => {
    render([q12h(3, 45), q24h(14, 30), q12h(11, 55)]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across the full grid + answer key', () => {
    const settings: TimeSettings = baseSettings({
      precisions: ['hour', 'half', 'quarter', '5min', '1min'],
      format: 'both',
      questionCount: 20,
    });
    const qs = generateTimeQuestions(settings, 20);
    generateTimePdf({
      pages: [qs],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across mixed-skill questions + answer key', () => {
    const settings: TimeSettings = baseSettings({
      skills: ['read', 'arith'],
      precisions: ['5min'],
      format: 'both',
      arithDifficulty: 'medium',
      questionCount: 20,
    });
    const qs = generateTimeQuestions(settings, 20);
    generateTimePdf({
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

describe('generateTimePdf — round-trip with generateTimeQuestions', () => {
  it('every generated question appears in the answer key in order', () => {
    const settings: TimeSettings = baseSettings({
      precisions: ['quarter'],
      format: '12h',
      questionCount: 10,
    });
    const qs = generateTimeQuestions(settings, 10);
    generateTimePdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    qs.forEach((q, i) => {
      expect(capturedTextCalls).toContain(`${i + 1}) ${expectedAnswerString(q)}`);
    });
  });

  it('exhaustive: every (precision × format) combo renders a numbered, encoding-safe PDF with answers', () => {
    const precisions = ['hour', 'half', 'quarter', '5min', '1min'] as const;
    const formats = ['12h', '24h', 'both'] as const;
    let combos = 0;
    for (const p of precisions) {
      for (const fmt of formats) {
        combos++;
        capturedTextCalls.length = 0;
        capturedCircles.length = 0;
        capturedLines.length = 0;
        const settings: TimeSettings = baseSettings({
          skills: ['read'],
          precisions: [p],
          format: fmt,
          questionCount: 10,
        });
        const qs = generateTimeQuestions(settings, 10);
        generateTimePdf({
          pages: [qs],
          title: 'T',
          subtitle: '',
          includeAnswerKey: true,
        });
        expect(capturedCircles.length).toBeGreaterThanOrEqual(qs.length * 2);
        capturedTextCalls.forEach(t => {
          expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}" (p=${p}, fmt=${fmt})`).toBe(false);
        });
        // Answer-key entries are present.
        qs.forEach((q, i) => {
          expect(capturedTextCalls).toContain(`${i + 1}) ${expectedAnswerString(q)}`);
        });
      }
    }
    expect(combos).toBe(15);
  });

  it('arith × difficulty × format matrix: every arith answer-key entry is present', () => {
    const difficulties = ['easy', 'medium', 'hard'] as const;
    const formats = ['12h', '24h'] as const;
    for (const d of difficulties) {
      for (const fmt of formats) {
        capturedTextCalls.length = 0;
        const settings: TimeSettings = baseSettings({
          skills: ['arith'],
          precisions: ['5min'],
          format: fmt,
          arithDifficulty: d,
          questionCount: 5,
        });
        const qs = generateTimeQuestions(settings, 5);
        generateTimePdf({
          pages: [qs],
          title: 'T',
          subtitle: '',
          includeAnswerKey: true,
        });
        qs.forEach((q, i) => {
          expect(capturedTextCalls).toContain(`${i + 1}) ${expectedAnswerString(q)}`);
        });
      }
    }
  });
});
