// @vitest-environment jsdom
//
// PieChart must print each slice's value — a pie-fraction question ("what
// fraction is this slice?") is unanswerable by eye without it (3/10 and 4/12
// look identical). This guards that the fix for that bug stays in place.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { PieChart } from './PieChart';

afterEach(cleanup);

const CATS = [
  { label: 'A', value: 3 },
  { label: 'B', value: 4 },
  { label: 'C', value: 2 },
  { label: 'D', value: 1 },
];

describe('PieChart', () => {
  it('prints each slice value (pie-fraction must be answerable)', () => {
    const { container } = render(<PieChart categories={CATS} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => (t.textContent ?? '').trim());
    for (const v of ['3', '4', '2', '1']) expect(texts).toContain(v);
  });

  it('is labelled for a11y', () => {
    const { container } = render(<PieChart categories={CATS} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/pie chart/i);
  });
});
