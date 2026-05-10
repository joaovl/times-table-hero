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

import { generateShapesPdf } from './pdf';
import { generateShapeQuestions } from './logic';
import type { ShapeQuestion, ShapeSettings } from './logic';

beforeEach(() => {
  capturedTextCalls.length = 0;
  capturedCircles.length = 0;
  capturedLines.length = 0;
});

const render = (qs: ShapeQuestion[]) =>
  generateShapesPdf({ pages: [qs], title: 'Test', subtitle: '' });

// Unicode Math Operators block (U+2200..U+22FF). No char in this block is
// in Helvetica's WinAnsi encoding — would mis-render in jsPDF.
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

const name = (shape: ShapeQuestion['shape']): ShapeQuestion => ({
  skill: 'name-2d',
  shape,
  units: 'cm',
  answer: 0,
});

const sides = (shape: NonNullable<ShapeQuestion['shape']>, n: number): ShapeQuestion => ({
  skill: 'count-sides',
  shape,
  units: 'cm',
  answer: n,
});

const peri = (w: number, h: number, units: ShapeQuestion['units'] = 'cm'): ShapeQuestion => ({
  skill: 'perimeter-rect',
  width: w,
  height: h,
  units,
  answer: 2 * (w + h),
});

const area = (w: number, h: number, units: ShapeQuestion['units'] = 'cm'): ShapeQuestion => ({
  skill: 'area-rect',
  width: w,
  height: h,
  units,
  answer: w * h,
});

describe('generateShapesPdf — question numbering', () => {
  it('renders "1." for a single question', () => {
    render([name('square')]);
    expect(capturedTextCalls).toContain('1.');
  });

  it('numbers continue across multiple pages', () => {
    generateShapesPdf({
      pages: [[name('square')], [name('hexagon')]],
      title: 'T',
      subtitle: '',
    });
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
  });

  it('renders the question number for each cell on a multi-question page', () => {
    render([name('triangle'), name('square'), name('pentagon'), name('hexagon')]);
    expect(capturedTextCalls).toContain('1.');
    expect(capturedTextCalls).toContain('2.');
    expect(capturedTextCalls).toContain('3.');
    expect(capturedTextCalls).toContain('4.');
  });
});

describe('generateShapesPdf — prompts', () => {
  it('renders "Name?" for name-2d, "Sides?" for count-sides', () => {
    render([name('square'), sides('hexagon', 6)]);
    expect(capturedTextCalls).toContain('Name?');
    expect(capturedTextCalls).toContain('Sides?');
  });

  it('renders "Perimeter?" and "Area?" for the rectangle skills', () => {
    render([peri(3, 4), area(5, 6)]);
    expect(capturedTextCalls).toContain('Perimeter?');
    expect(capturedTextCalls).toContain('Area?');
  });
});

describe('generateShapesPdf — dimension labels', () => {
  it('perimeter-rect: width and height labels appear with units', () => {
    render([peri(7, 4, 'cm')]);
    expect(capturedTextCalls).toContain('7 cm');
    expect(capturedTextCalls).toContain('4 cm');
  });

  it('area-rect: width and height labels appear with units', () => {
    render([area(12, 9, 'mm')]);
    expect(capturedTextCalls).toContain('12 mm');
    expect(capturedTextCalls).toContain('9 mm');
  });

  it('dimension labels respect the units chosen', () => {
    render([peri(2, 3, 'in')]);
    expect(capturedTextCalls).toContain('2 in');
    expect(capturedTextCalls).toContain('3 in');
  });
});

describe('generateShapesPdf — shape primitives', () => {
  it('circle question draws a circle primitive', () => {
    render([name('circle')]);
    // At least one circle primitive must have been emitted for the figure.
    expect(capturedCircles.length).toBeGreaterThanOrEqual(1);
  });

  it('polygon questions draw line primitives for edges', () => {
    render([name('triangle')]);
    // Triangle has 3 edges; page chrome adds a handful more.
    expect(capturedLines.length).toBeGreaterThan(3);
  });

  it('a 4-cell page emits primitives across all cells', () => {
    render([name('triangle'), name('square'), name('pentagon'), name('hexagon')]);
    // Sum of edges: 3 + 4 + 5 + 6 = 18 polygon lines minimum (+ chrome).
    expect(capturedLines.length).toBeGreaterThan(18);
  });
});

describe('generateShapesPdf — answer key', () => {
  it('does not include answer strings when includeAnswerKey is unset', () => {
    render([peri(3, 4, 'cm')]);
    expect(capturedTextCalls).not.toContain('1) 14 cm');
  });

  it('perimeter answer formatted with units', () => {
    generateShapesPdf({
      pages: [[peri(7, 5, 'cm')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 24 cm');
  });

  it('area answer formatted with units', () => {
    generateShapesPdf({
      pages: [[area(6, 4, 'mm')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 24 mm');
  });

  it('name-2d answer is the shape name', () => {
    generateShapesPdf({
      pages: [[name('hexagon')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) hexagon');
  });

  it('count-sides answer is the integer string', () => {
    generateShapesPdf({
      pages: [[sides('octagon', 8)]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 8');
  });

  it('continuous numbering across pages in the answer key', () => {
    generateShapesPdf({
      pages: [[name('hexagon'), sides('square', 4)], [peri(3, 4, 'cm')]],
      title: 'Maths',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) hexagon');
    expect(capturedTextCalls).toContain('2) 4');
    expect(capturedTextCalls).toContain('3) 14 cm');
    expect(capturedTextCalls).toContain('Maths — Answer Key');
  });
});

describe('generateShapesPdf — encoding safety', () => {
  it('no Math Operators block chars (single page, mixed skills)', () => {
    render([name('hexagon'), sides('pentagon', 5), peri(3, 4, 'cm'), area(5, 6, 'mm')]);
    capturedTextCalls.forEach(t => {
      expect(MATH_OPERATORS_BLOCK.test(t), `unsafe char in "${t}"`).toBe(false);
    });
  });

  it('no Math Operators block chars across full grid + answer key', () => {
    const settings: ShapeSettings = {
      skills: ['name-2d', 'count-sides', 'perimeter-rect', 'area-rect'],
      units: 'cm',
      difficulty: 'medium',
      gameMode: 'questions',
      questionCount: 18,
      timeLimit: 0,
    };
    const qs = generateShapeQuestions(settings, 18);
    generateShapesPdf({
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

describe('generateShapesPdf — round-trip with generateShapeQuestions', () => {
  it('every generated question appears in the answer key in order', () => {
    const settings: ShapeSettings = {
      skills: ['perimeter-rect'],
      units: 'cm',
      difficulty: 'easy',
      gameMode: 'questions',
      questionCount: 12,
      timeLimit: 0,
    };
    const qs = generateShapeQuestions(settings, 12);
    generateShapesPdf({
      pages: [qs],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    qs.forEach((q, i) => {
      expect(capturedTextCalls).toContain(`${i + 1}) ${q.answer} ${q.units}`);
    });
  });
});
