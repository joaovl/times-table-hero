// @vitest-environment jsdom
//
// Answer-integrity for the line-chart renderer: like BarChart, a read-line
// question must not print the queried point's value on the chart.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { LineChart } from './LineChart';

afterEach(cleanup);

const CATS = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 9 },
  { label: 'Wed', value: 6 },
];

const vals = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('[data-testid="line-value"]')).map(n => (n.textContent ?? '').trim());

describe('LineChart value labels', () => {
  it('shows every point value when nothing is hidden', () => {
    const { container } = render(<LineChart categories={CATS} />);
    expect(vals(container).sort()).toEqual(['4', '6', '9']);
  });

  it('hides the queried point value (read-line)', () => {
    const { container } = render(<LineChart categories={CATS} hideValueIndices={[1]} />);
    const shown = vals(container);
    expect(shown).not.toContain('9'); // the answer is hidden
    expect(shown.sort()).toEqual(['4', '6']); // the rest stay visible
  });

  it('is labelled for a11y', () => {
    const { container } = render(<LineChart categories={CATS} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/line chart/i);
  });
});
