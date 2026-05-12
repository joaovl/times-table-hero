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
    setLineDashPattern(_p: number[], _o: number) {}
    line(x1: number, y1: number, x2: number, y2: number) {
      capturedLines.push({ x1, y1, x2, y2 });
    }
    circle(x: number, y: number, r: number) {
      capturedCircles.push({ x, y, r });
    }
    ellipse(_x: number, _y: number, _rx: number, _ry: number) {
      // No tests assert ellipse counts but the FakeJsPDF needs the method
      // so cylinder rendering doesn't throw.
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

const tri = (base: number, h: number, units: ShapeQuestion['units'] = 'cm'): ShapeQuestion => ({
  skill: 'area-tri',
  width: base,
  height: h,
  units,
  answer: Math.round(0.5 * base * h * 100) / 100,
});

const circArea = (r: number, units: ShapeQuestion['units'] = 'cm'): ShapeQuestion => ({
  skill: 'area-circle',
  radius: r,
  units,
  answer: Math.round(3.14 * r * r * 100) / 100,
});

const circ = (r: number, units: ShapeQuestion['units'] = 'cm'): ShapeQuestion => ({
  skill: 'circumference',
  radius: r,
  units,
  answer: Math.round(2 * 3.14 * r * 100) / 100,
});

const angle = (deg: number, cat: 'acute' | 'right' | 'obtuse'): ShapeQuestion => ({
  skill: 'angle-name',
  angle: deg,
  category: cat,
  units: 'cm',
  answer: deg,
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

  it('area answer formatted with squared units', () => {
    generateShapesPdf({
      pages: [[area(6, 4, 'mm')]],
      title: 'Test',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 24 mm²');
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

// ---------------------------------------------------------------------------
// v3 (Y5) — 3D-solid, angle-measure, lines-of-symmetry, coord, translation.
// ---------------------------------------------------------------------------

const name3d = (solid: NonNullable<ShapeQuestion['solid']>): ShapeQuestion => ({
  skill: 'name-3d',
  solid,
  units: 'cm',
  answer: 0,
});

const faces = (solid: NonNullable<ShapeQuestion['solid']>, n: number): ShapeQuestion => ({
  skill: 'count-faces',
  solid,
  units: 'cm',
  answer: n,
});

const edges = (solid: NonNullable<ShapeQuestion['solid']>, n: number): ShapeQuestion => ({
  skill: 'count-edges',
  solid,
  units: 'cm',
  answer: n,
});

const vertices = (solid: NonNullable<ShapeQuestion['solid']>, n: number): ShapeQuestion => ({
  skill: 'count-vertices',
  solid,
  units: 'cm',
  answer: n,
});

const measure = (deg: number): ShapeQuestion => ({
  skill: 'angle-measure',
  angle: deg,
  units: 'cm',
  answer: deg,
});

const reflex = (deg: number, cat: 'acute' | 'right' | 'obtuse' | 'reflex'): ShapeQuestion => ({
  skill: 'angle-name-reflex',
  angle: deg,
  category: cat,
  units: 'cm',
  answer: deg,
});

const sym = (shape: NonNullable<ShapeQuestion['shape']>, n: number): ShapeQuestion => ({
  skill: 'lines-of-symmetry',
  shape,
  units: 'cm',
  answer: n,
});

const coordRead = (x: number, y: number, gridMax = 5): ShapeQuestion => ({
  skill: 'coord-read',
  point: { x, y },
  gridMax,
  units: 'cm',
  answer: x * 100 + y,
});

const coordPlot = (x: number, y: number, gridMax = 5): ShapeQuestion => ({
  skill: 'coord-plot',
  point: { x, y },
  gridMax,
  units: 'cm',
  answer: x * 100 + y,
});

const translate = (x: number, y: number, dx: number, dy: number, gridMax = 5): ShapeQuestion => ({
  skill: 'translation',
  point: { x, y },
  delta: { dx, dy },
  gridMax,
  units: 'cm',
  answer: 0,
});

describe('generateShapesPdf — v3 prompts', () => {
  it('renders prompts for each new skill', () => {
    render([
      name3d('cube'),
      faces('cube', 6),
      edges('cube', 12),
      vertices('cube', 8),
      measure(45),
      reflex(270, 'reflex'),
      sym('square', 4),
      coordRead(3, 4),
      coordPlot(3, 4),
      translate(2, 3, 4, 2),
    ]);
    expect(capturedTextCalls).toContain('Faces?');
    expect(capturedTextCalls).toContain('Edges?');
    expect(capturedTextCalls).toContain('Vertices?');
    expect(capturedTextCalls).toContain('Lines of symmetry?');
    expect(capturedTextCalls).toContain('Coordinates? (x,y)');
    expect(capturedTextCalls).toContain('Plot (3, 4)');
    // name-3d and angle-name-reflex use the same "Name?" / "Angle?" as v1.
    expect(capturedTextCalls).toContain('Name?');
    // angle-measure prompt mentions "degrees".
    expect(capturedTextCalls.some(t => t.includes('degrees'))).toBe(true);
  });
});

describe('generateShapesPdf — v3 answer key', () => {
  it('name-3d answer is the solid name', () => {
    generateShapesPdf({
      pages: [[name3d('cylinder')]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) cylinder');
  });

  it('count-faces answer is the integer', () => {
    generateShapesPdf({
      pages: [[faces('pyramid', 5)]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 5');
  });

  it('angle-measure answer includes °', () => {
    generateShapesPdf({
      pages: [[measure(135)]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) 135°');
  });

  it('angle-name-reflex answer is the category', () => {
    generateShapesPdf({
      pages: [[reflex(270, 'reflex')]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) reflex');
  });

  it('coord-read answer is "(x, y)"', () => {
    generateShapesPdf({
      pages: [[coordRead(3, 4)]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) (3, 4)');
  });

  it('translation answer is the translated endpoint', () => {
    generateShapesPdf({
      pages: [[translate(2, 3, 4, 2)]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    expect(capturedTextCalls).toContain('1) (6, 5)');
  });
});

describe('generateShapesPdf — v3 figures emit primitives', () => {
  it('3D-solid skills draw lines (iso edges)', () => {
    render([name3d('cube'), name3d('pyramid'), name3d('cone')]);
    // Cube alone: ≥9 visible edges; cone: 2 slant + arc segments.
    expect(capturedLines.length).toBeGreaterThan(10);
  });

  it('sphere draws a circle primitive', () => {
    render([name3d('sphere')]);
    expect(capturedCircles.length).toBeGreaterThanOrEqual(1);
  });

  it('coord-grid skills emit grid lines + tick labels', () => {
    render([coordRead(3, 4)]);
    // Grid: (gridMax+1) verticals + (gridMax+1) horizontals + 2 axis lines.
    expect(capturedLines.length).toBeGreaterThan(10);
    // Tick "3" should appear as a label.
    expect(capturedTextCalls).toContain('3');
  });
});

describe('generateShapesPdf — v3 encoding safety', () => {
  // Same Unicode Math Operators block guard, applied across the new skills.
  it('no Math Operators block chars in v3 figures + answer key', () => {
    const qs: ShapeQuestion[] = [
      name3d('cube'),
      faces('cuboid', 6),
      edges('cylinder', 2),
      vertices('cone', 1),
      measure(135),
      reflex(270, 'reflex'),
      sym('hexagon', 6),
      coordRead(2, 5),
      coordPlot(4, 1),
      translate(1, 2, 3, 3, 10),
    ];
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

  it('angle-measure answer uses U+00B0 ° which is WinAnsi-safe', () => {
    generateShapesPdf({
      pages: [[measure(45)]],
      title: 'T',
      subtitle: '',
      includeAnswerKey: true,
    });
    const found = capturedTextCalls.find(t => t === '1) 45°');
    expect(found).toBeDefined();
    // The degree sign at index 5 in "1) 45°" is U+00B0.
    expect(found!.charCodeAt(5)).toBe(0x00b0);
  });
});
