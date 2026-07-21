// @vitest-environment jsdom
//
// The analog clock must NOT print the digital time as visible text, or a
// read-clock question ("what time is it?") is trivially readable off the face.
// (The aria-label does state the time — that is a necessary accommodation so
// assistive-tech users can attempt the question at all; it is not visible.)
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ClockDisplay } from './ClockDisplay';

afterEach(cleanup);

describe('ClockDisplay', () => {
  it('is a labelled image', () => {
    const { container } = render(<ClockDisplay hours={3} minutes={30} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toMatch(/clock/i);
  });

  it('does not print the digital time as text on the face', () => {
    const { container } = render(<ClockDisplay hours={3} minutes={30} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => (t.textContent ?? '').trim());
    // Only 1..12 hour numerals appear; no "H:MM" digital readout.
    expect(texts.some(t => /\d{1,2}\s*:\s*\d{2}/.test(t))).toBe(false);
    expect(texts).not.toContain('3:30');
  });
});
