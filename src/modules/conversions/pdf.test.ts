import { describe, it, expect, beforeEach, vi } from 'vitest';

const { capturedTextCalls, capturedLines, capturedRects, capturedFillColors } = vi.hoisted(() => ({
  capturedTextCalls: [] as string[],
  capturedLines: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
  capturedRects: [] as Array<{ x: number; y: number; w: number; h: number; style?: string }>,
  capturedFillColors: [] as Array<[number, number, number]>,
}));

vi.mock('jspdf', () => {
  class FakeJsPDF {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setLineWidth() {}
    setDrawColor() {}
    setFillColor(r: number, g: number, b: number) {
      capturedFillColors.push([r, g, b]);
    }
    line(x1: number, y1: number, x2: number, y2: number) {
      capturedLines.push({ x1, y1, x2, y2 });
    }
    rect(x: number, y: number, w: number, h: number, style?: string) {
      capturedRects.push({ x, y, w, h, style });
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
    text(text: unknown) {
      if (typeof text === 'string') capturedTextCalls.push(text);
      else if (Array.isArray(text)) {
        for (const t of text) if (typeof t === 'string') capturedTextCalls.push(t);
      }
    }
  }
  return { default: FakeJsPDF };
});

import { generateConversionsPdf } from './pdf';
import { generateConversionQuestions } from './logic';
import type { ConversionQuestion, ConversionSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
  capturedLines.length = 0;
  capturedRects.length = 0;
  capturedFillColors.length = 0;
});

// Unicode Math Operators block — no char in this block is WinAnsi.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

const render = (qs: ConversionQuestion[]) =>
  generateConversionsPdf({ pages: [qs], title: 'Test', subtitle: '' });

const simple = (skill: ConversionQuestion['skill']): ConversionQuestion => {
  if (skill === 'length-cm-mm') {
    return { skill, fromValue: 30, fromUnit: 'cm', toUnit: 'mm', answer: 300 };
  }
  if (skill === 'mass-kg-g') {
    return { skill, fromValue: 2, fromUnit: 'kg', toUnit: 'g', answer: 2000 };
  }
  if (skill === 'time-h-min') {
    return { skill, fromValue: 2, fromUnit: 'h', toUnit: 'min', answer: 120 };
  }
  if (skill === 'metric-imperial') {
    return { skill, fromValue: 5, fromUnit: 'miles', toUnit: 'km', answer: 8 };
  }
  throw new Error(`simple() can't build ${skill}`);
};

const lShape = (): ConversionQuestion => ({
  skill: 'perimeter-composite',
  layout: 'L',
  figureSpec: { outerW: 10, outerH: 8, cutW: 4, cutH: 3 },
  edges: [10, 5, 4, 3, 6, 8],
  answer: 36,
  unit: 'cm',
});

const irregular = (): ConversionQuestion => ({
  skill: 'area-irregular',
  grid: [
    [true, true, false],
    [true, true, true],
    [false, true, false],
  ],
  answer: 6,
  unit: 'sq',
});

const cube = (n: number): ConversionQuestion => ({
  skill: 'volume-cube',
  side: n,
  answer: n ** 3,
  unit: 'cm³',
});

const cuboid = (l: number, w: number, h: number): ConversionQuestion => ({
  skill: 'volume-cuboid',
  length: l,
  width: w,
  height: h,
  answer: l * w * h,
  unit: 'cm³',
});

// -------------------------------------------------------------------------
// Numbering
// -------------------------------------------------------------------------

describe('generateConversionsPdf — question numbering', () => {
  it('renders "1." for a single question', () => {
    render([simple('length-cm-mm')]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('numbers continue across pages', () => {
    generateConversionsPdf({
      pages: [[simple('length-cm-mm')], [simple('mass-kg-g')]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });

  it('numbers every cell on a multi-question page', () => {
    render([
      simple('length-cm-mm'),
      simple('mass-kg-g'),
      simple('time-h-min'),
      simple('metric-imperial'),
    ]);
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
    expect(capturedTextCalls).toContain('3.');
    expect(capturedTextCalls).toContain('4.');
  });
});

// -------------------------------------------------------------------------
// Prompts
// -------------------------------------------------------------------------

describe('generateConversionsPdf — prompts', () => {
  it('renders the conversion prompt for a simple skill', () => {
    render([simple('length-cm-mm')]);
    expect(capturedTextCalls).toContain('30 cm = ? mm');
  });

  it('renders the metric-imperial prompt with "approximately"', () => {
    render([simple('metric-imperial')]);
    const joined = capturedTextCalls.join(' | ');
    expect(joined).toContain('approximately');
  });

  it('renders "Perimeter?" for composite-perimeter cells', () => {
    render([lShape()]);
    const found = capturedTextCalls.some(t => t.startsWith('Perimeter?'));
    expect(found).toBe(true);
  });

  it('renders "Volume?" for cube / cuboid cells', () => {
    render([cube(3), cuboid(2, 3, 4)]);
    const vol = capturedTextCalls.filter(t => t === 'Volume?').length;
    expect(vol).toBeGreaterThanOrEqual(2);
  });
});

// -------------------------------------------------------------------------
// Figure primitives
// -------------------------------------------------------------------------

describe('generateConversionsPdf — figure primitives', () => {
  it('L-shape draws 6 polygon edges + page chrome', () => {
    render([lShape()]);
    // 6 polygon lines from the L + a few chrome lines.
    expect(capturedLines.length).toBeGreaterThanOrEqual(6);
  });

  it('irregular-area emits a grid of rect primitives', () => {
    render([irregular()]);
    // 3x3 grid = 9 rect calls minimum.
    expect(capturedRects.length).toBeGreaterThanOrEqual(9);
  });

  it('irregular-area shaded cells set a grey fill color', () => {
    render([irregular()]);
    // (180, 180, 180) grey is used for shaded cells.
    const grey = capturedFillColors.some(([r, g, b]) => r === 180 && g === 180 && b === 180);
    expect(grey).toBe(true);
  });

  it('irregular-area shaded cells use the "FD" rect style (filled + stroked)', () => {
    render([irregular()]);
    const filled = capturedRects.filter(r => r.style === 'FD');
    // Six shaded cells in the test fixture.
    expect(filled.length).toBe(6);
  });

  it('cube draws 9 edges (3 visible faces × 3 distinct edges each, with shared edges)', () => {
    render([cube(3)]);
    // The cuboid renderer emits 10 line calls for the cuboid edges (front
    // face 4 + top 3 + right 3). Allow ≥ 9 for some margin if we ever
    // share an edge.
    expect(capturedLines.length).toBeGreaterThanOrEqual(9);
  });
});

// -------------------------------------------------------------------------
// Dimension labels
// -------------------------------------------------------------------------

describe('generateConversionsPdf — dimension labels', () => {
  it('cube edge labels include the side measurement', () => {
    render([cube(5)]);
    const found = capturedTextCalls.some(t => t.includes('5 cm'));
    expect(found).toBe(true);
  });

  it('cuboid labels include all three dimensions', () => {
    render([cuboid(2, 3, 4)]);
    expect(capturedTextCalls).toContain('2 cm');
    expect(capturedTextCalls).toContain('3 cm');
    expect(capturedTextCalls).toContain('4 cm');
  });

  it('L-shape edge labels include the outer dimensions', () => {
    render([lShape()]);
    expect(capturedTextCalls).toContain('10 cm');
    expect(capturedTextCalls).toContain('8 cm');
  });
});

// -------------------------------------------------------------------------
// Answer key
// -------------------------------------------------------------------------

describe('generateConversionsPdf — answer key', () => {
  it('does not include answer strings when includeAnswerKey is unset', () => {
    render([simple('length-cm-mm')]);
    expect(capturedTextCalls).not.toContain('1) 300 mm');
  });

  it('simple conversion answer formatted with toUnit', () => {
    generateConversionsPdf({
      pages: [[simple('length-cm-mm')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 300 mm');
  });

  it('metric-imperial answer uses "~" rather than ≈', () => {
    generateConversionsPdf({
      pages: [[simple('metric-imperial')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) ~ 8 km');
  });

  it('cube answer includes cm³', () => {
    generateConversionsPdf({
      pages: [[cube(3)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 27 cm³');
  });

  it('cuboid answer includes cm³', () => {
    generateConversionsPdf({
      pages: [[cuboid(2, 3, 4)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 24 cm³');
  });

  it('continuous numbering across pages in the answer key', () => {
    generateConversionsPdf({
      pages: [[simple('length-cm-mm'), simple('mass-kg-g')], [cube(3)]],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 300 mm');
    expect(capturedTextCalls).toContain('2) 2000 g');
    expect(capturedTextCalls).toContain('3) 27 cm³');
    expect(capturedTextCalls).toContain('Maths — Answer Key');
  });
});

// -------------------------------------------------------------------------
// Encoding safety
// -------------------------------------------------------------------------

describe('generateConversionsPdf — encoding safety', () => {
  it('no Math Operators block chars in mixed-skills single-page render', () => {
    render([
      simple('length-cm-mm'),
      simple('mass-kg-g'),
      simple('metric-imperial'),
      lShape(),
      irregular(),
      cube(3),
      cuboid(2, 3, 4),
    ]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across a full grid + answer key', () => {
    const settings: ConversionSettings = {
      skills: [
        'length-cm-mm',
        'mass-kg-g',
        'volume-L-mL',
        'time-h-min',
        'metric-imperial',
        'perimeter-composite',
        'area-irregular',
        'volume-cube',
        'volume-cuboid',
      ],
      difficulty: 'medium',
      gameMode: 'questions',
      questionCount: 20,
      timeLimit: 0,
    };
    const qs = generateConversionQuestions(settings, 20);
    generateConversionsPdf({
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

// -------------------------------------------------------------------------
// Round-trip
// -------------------------------------------------------------------------

describe('generateConversionsPdf — round-trip with generateConversionQuestions', () => {
  it('every generated cube question appears in the answer key in order', () => {
    const settings: ConversionSettings = {
      skills: ['volume-cube'],
      difficulty: 'easy',
      gameMode: 'questions',
      questionCount: 8,
      timeLimit: 0,
    };
    const qs = generateConversionQuestions(settings, 8);
    generateConversionsPdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    qs.forEach((q, i) => {
      if (q.skill === 'volume-cube') {
        expect(capturedTextCalls).toContain(`${i + 1}) ${q.answer} cm³`);
      }
    });
  });
});
