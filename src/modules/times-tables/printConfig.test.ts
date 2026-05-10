import { describe, it, expect } from 'vitest';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  formatTablesRange,
  formatPdfOpsLabel,
  buildPrintSummary,
} from './printConfig';

const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;

describe('PRINT_PAGE_OPTIONS', () => {
  it('exposes 1, 3, 5, 10, 20', () => {
    expect(PRINT_PAGE_OPTIONS).toEqual([1, 3, 5, 10, 20]);
  });
});

describe('PRINT_PER_PAGE_OPTIONS', () => {
  it('exposes 20, 40, 60, 80, 100', () => {
    expect(PRINT_PER_PAGE_OPTIONS).toEqual([20, 40, 60, 80, 100]);
  });
});

describe('formatTablesRange', () => {
  it('returns "no tables" for an empty selection', () => {
    expect(formatTablesRange([])).toBe('no tables');
  });

  it('returns "Table N" for a single selection', () => {
    expect(formatTablesRange([7])).toBe('Table 7');
  });

  it('collapses a contiguous range to "Tables N–M"', () => {
    expect(formatTablesRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('Tables 1–12');
    expect(formatTablesRange([3, 4, 5, 6])).toBe('Tables 3–6');
  });

  it('lists sparse selections with commas', () => {
    expect(formatTablesRange([2, 5, 7])).toBe('Tables 2, 5, 7');
  });

  it('keeps the same form when a 2-table selection is contiguous', () => {
    expect(formatTablesRange([4, 5])).toBe('Tables 4–5');
  });
});

describe('formatPdfOpsLabel', () => {
  it('multiply, divide, square use compact symbols (all in WinAnsi)', () => {
    expect(formatPdfOpsLabel('multiply')).toBe('×');
    expect(formatPdfOpsLabel('divide')).toBe('÷');
    expect(formatPdfOpsLabel('square')).toBe('x²');
  });

  it('sqrt spells out the word (√ is not in WinAnsi)', () => {
    expect(formatPdfOpsLabel('sqrt')).toBe('square roots');
  });

  it("'all' lists every op without using √ (which would mis-render)", () => {
    expect(formatPdfOpsLabel('all')).toBe('× ÷ x² square roots');
  });

  it('every label avoids the Mathematical Operators Unicode block (no PDF mis-rendering)', () => {
    for (const op of ['multiply', 'divide', 'square', 'sqrt', 'all'] as const) {
      const label = formatPdfOpsLabel(op);
      expect(MATH_OPERATORS_BLOCK.test(label), `unsafe char in "${label}"`).toBe(false);
    }
  });
});

describe('buildPrintSummary', () => {
  it('summary for full range, all ops', () => {
    const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(buildPrintSummary('all', tables)).toBe('All (× ÷ x² √) • Tables 1–12');
  });

  it('summary for partial table set, single op', () => {
    expect(buildPrintSummary('multiply', [3, 5, 7])).toBe('× • Tables 3, 5, 7');
  });

  it('summary for empty selection notes "no tables"', () => {
    expect(buildPrintSummary('multiply', [])).toBe('× • Tables no tables');
  });
});
