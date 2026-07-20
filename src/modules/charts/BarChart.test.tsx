// @vitest-environment jsdom
//
// Answer-integrity tests for the bar-chart renderer. The regression these
// guard against (reported 2026-07-20): the chart printed EVERY bar's value on
// top of the bar, which for a read-bar question hands the answer straight to
// the child, and for compare/total questions shows numbers that don't equal
// the answer ("the answer is shown with a different number on top").

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { BarChart } from './BarChart';
import { axisMax, axisTickCount, chartHideValueIndices } from './logic';
import type { ChartQuestion } from './logic';

afterEach(cleanup);

const CATS = [
  { label: 'Mon', value: 6 },
  { label: 'Tue', value: 7 },
  { label: 'Wed', value: 8 },
  { label: 'Thu', value: 3 },
];

function barValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-testid="bar-value"]')).map(
    n => (n.textContent ?? '').trim()
  );
}

describe('BarChart value labels', () => {
  it('prints a value on every bar when nothing is hidden', () => {
    const { container } = render(<BarChart categories={CATS} />);
    expect(barValues(container).sort()).toEqual(['3', '6', '7', '8']);
  });

  it('omits the value on the bar the question asks about (read-bar)', () => {
    // Tue is the queried bar; its number must NOT be printed, or the answer is
    // handed to the child.
    const { container } = render(
      <BarChart categories={CATS} hideValueIndices={[1]} />
    );
    const shown = barValues(container);
    expect(shown).not.toContain('7'); // the answer is hidden
    expect(shown.sort()).toEqual(['3', '6', '8']); // the rest stay visible
  });
});

describe('chartHideValueIndices', () => {
  const base: Omit<ChartQuestion, 'skill' | 'targets'> = {
    categories: CATS,
    prompt: 'x',
    answer: 7,
    unit: 'votes',
  };

  it('hides the asked bar for read-bar', () => {
    const q = { ...base, skill: 'read-bar', targets: [1] } as ChartQuestion;
    expect(chartHideValueIndices(q)).toEqual([1]);
  });

  it('hides the asked point for read-line', () => {
    const q = { ...base, skill: 'read-line', targets: [2] } as ChartQuestion;
    expect(chartHideValueIndices(q)).toEqual([2]);
  });

  it('hides nothing for compute skills (numbers are inputs, not the answer)', () => {
    for (const skill of ['compare-bar', 'total-bar', 'multi-step-bar'] as const) {
      const q = { ...base, skill, targets: [0, 2] } as ChartQuestion;
      expect(chartHideValueIndices(q)).toEqual([]);
    }
  });
});

describe('axis is readable (integer gridline steps)', () => {
  // Every y-axis gridline must land on a whole number so a child can read a
  // bar's height off the axis. The old axis put gridlines at 1.6 / 3.2 / ...
  // for small ranges, which is why value labels were bolted on as a crutch.
  for (const dataMax of [1, 3, 6, 7, 8, 10, 11, 50, 99, 100, 457, 1000]) {
    it(`dataMax=${dataMax} -> whole-number gridline step`, () => {
      const yMax = axisMax(dataMax);
      const ticks = axisTickCount(yMax);
      const step = yMax / ticks;
      expect(Number.isInteger(step), `step ${step} for yMax ${yMax}`).toBe(true);
    });
  }
});
