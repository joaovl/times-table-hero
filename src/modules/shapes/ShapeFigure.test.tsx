// @vitest-environment jsdom
//
// Render + a11y smoke for the shape figure. ShapeFigure legitimately prints
// dimension INPUTS (a rectangle's width/height are needed to compute its
// area/perimeter), so this is not a "no value shown" test — it asserts the
// figure renders as a labelled image for a real generated question.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ShapeFigure } from './ShapeFigure';
import { generateShapeQuestions } from './logic';
import { shapeSettings } from '@/lib/testkit/settings';

afterEach(cleanup);

describe('ShapeFigure', () => {
  it('renders a labelled rectangle figure for an area-rect question', () => {
    const [q] = generateShapeQuestions(shapeSettings('area-rect'), 1);
    const { container } = render(<ShapeFigure shape="rect-with-dims" question={q} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/rectangle/i);
    // The width/height dimension labels are drawn as text.
    expect(container.querySelectorAll('text').length).toBeGreaterThan(0);
  });

  it('renders a labelled triangle figure for an area-tri question', () => {
    const [q] = generateShapeQuestions(shapeSettings('area-tri'), 1);
    const { container } = render(<ShapeFigure shape="right-triangle" question={q} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/triangle/i);
  });
});
