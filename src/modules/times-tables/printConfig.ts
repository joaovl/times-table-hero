import type { Operation } from './logic';

// Page-count picker options.
export const PRINT_PAGE_OPTIONS = [1, 3, 5, 10, 20];

// Per-page count options for times-tables worksheets. The 5-col grid
// scales rows with count, so larger sets stay readable.
export const PRINT_PER_PAGE_OPTIONS = [20, 40, 60, 80, 100];

// Compact label for the PDF header — collapses contiguous table sets.
export function formatTablesRange(sorted: number[]): string {
  if (sorted.length === 0) return 'no tables';
  if (sorted.length === 1) return `Table ${sorted[0]}`;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (sorted.length === max - min + 1) return `Tables ${min}–${max}`;
  return `Tables ${sorted.join(', ')}`;
}

// Helvetica's WinAnsi encoding has no glyph for U+221A (√), so we spell out
// "square roots" rather than use the symbol in the PDF header. Other glyphs
// (×, ÷, ²) are in WinAnsi and render correctly.
export function formatPdfOpsLabel(operation: Operation): string {
  switch (operation) {
    case 'multiply': return '×';
    case 'divide':   return '÷';
    case 'square':   return 'x²';
    case 'sqrt':     return 'square roots';
    case 'all':      return '× ÷ x² square roots';
  }
}

// One-line summary for the print modal.
export function buildPrintSummary(operation: Operation, tables: number[]): string {
  const opLabel: Record<Operation, string> = {
    multiply: '×',
    divide: '÷',
    square: 'x²',
    sqrt: '√',
    all: 'All (× ÷ x² √)',
  };
  const sorted = [...tables].sort((a, b) => a - b);
  const isFull = sorted.length >= 12 && sorted[0] >= 1 && sorted[sorted.length - 1] <= 12;
  const tablesLabel = sorted.length === 0
    ? 'no tables'
    : isFull
      ? '1–12'
      : sorted.join(', ');
  return `${opLabel[operation]} • Tables ${tablesLabel}`;
}
