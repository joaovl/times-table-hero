import jsPDF from 'jspdf';
import type { FractionQuestion } from './logic';
import { skillOp } from './logic';

export interface FractionPdfOptions {
  pages: FractionQuestion[][];
  title: string;
  subtitle: string;
  studentName?: string;
  /** Append a final page that lists every answer in number order. */
  includeAnswerKey?: boolean;
}

const A4_W = 210;
const A4_H = 297;
const MARGIN = 15;
const PRINT_W = A4_W - MARGIN * 2;
const PRINT_H = A4_H - MARGIN * 2;
const HEADER_H = 22;
const FOOTER_H = 12;

// PDF-safe operator glyphs. We use ASCII '+' and '-' (hyphen-minus, U+002D)
// because Helvetica's WinAnsi encoding does not include the math-minus
// U+2212 — using it would render as a stray quote. The '×' (U+00D7) glyph
// is in WinAnsi, but fractions only need + and −.
function opSymbol(op: 'add' | 'sub'): string {
  return op === 'add' ? '+' : '-';
}

// Render one stacked fraction (num over rule over den) at the given anchor.
// Anchor (x, y) is the LEFT edge of the fraction's horizontal centre line;
// numerator sits above, denominator sits below. Returns the width consumed
// so callers can lay out an equation left-to-right.
function drawFraction(
  doc: jsPDF,
  frac: { num: number; den: number },
  cx: number,
  cy: number,
  fs: number
): number {
  const numStr = String(frac.num);
  const denStr = String(frac.den);
  const numW = doc.getTextWidth(numStr);
  const denW = doc.getTextWidth(denStr);
  // Bar width: max of num/den widths plus a small pad so the line clearly
  // spans both numbers.
  const barW = Math.max(numW, denW) + 2;
  const lineH = fs * 0.42;

  const barLeft = cx;
  const barRight = cx + barW;

  // Numerator centred above the bar.
  const numX = barLeft + (barW - numW) / 2;
  const numY = cy - 1; // just above the bar line
  doc.text(numStr, numX, numY);

  // Bar.
  doc.setLineWidth(0.4);
  doc.line(barLeft, cy + 0.4, barRight, cy + 0.4);

  // Denominator centred below the bar.
  const denX = barLeft + (barW - denW) / 2;
  const denY = cy + lineH + 1;
  doc.text(denStr, denX, denY);

  return barW;
}

function drawQuestion(
  doc: jsPDF,
  q: FractionQuestion,
  x: number,
  y: number,
  fs: number,
  num: number
) {
  // Question prefix sits on the bar line, left-aligned.
  const prefix = `${num}.`;
  doc.text(prefix, x, y);
  const prefixW = doc.getTextWidth(prefix);
  let cursor = x + prefixW + 2;

  const op = skillOp(q.skill);
  const opStr = ` ${opSymbol(op)} `;

  // a fraction
  cursor += drawFraction(doc, q.a, cursor, y, fs) + 1;

  // operator
  const opW = doc.getTextWidth(opStr);
  doc.text(opStr, cursor, y);
  cursor += opW + 1;

  // b fraction
  cursor += drawFraction(doc, q.b, cursor, y, fs) + 1;

  // " = ___"
  const eq = ' = ';
  doc.text(eq, cursor, y);
  cursor += doc.getTextWidth(eq) + 1;

  // Answer blank as a short horizontal rule.
  doc.setLineWidth(0.3);
  doc.line(cursor, y + 0.6, cursor + 14, y + 0.6);
}

function drawPage(
  doc: jsPDF,
  questions: FractionQuestion[],
  title: string,
  subtitle: string,
  studentName: string | undefined,
  numberOffset: number
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, left, top + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const nameLabel = 'Name:';
  const nameLabelW = doc.getTextWidth(nameLabel);
  const nameLineEnd = right;
  const nameLineStart = nameLineEnd - 50;
  doc.text(nameLabel, nameLineStart - nameLabelW - 2, top + 6);
  if (studentName) doc.text(studentName, nameLineStart + 1, top + 5.5);
  doc.setLineWidth(0.3);
  doc.line(nameLineStart, top + 7, nameLineEnd, top + 7);

  doc.setLineWidth(0.5);
  doc.line(left, top + 10, right, top + 10);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(subtitle, left, top + 15);
  doc.setTextColor(0);

  // 3-col × 8-row layout — fractions need vertical room for the stacked
  // num/bar/den notation on both operands.
  const cols = 3;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / Math.max(rows, 8);

  const fs = 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW + 2;
    // Anchor the bar of the first fraction on the cell vertical centre so
    // both num and den fit cleanly.
    const cellTop = gridTop + row * rowH;
    const yBar = cellTop + rowH / 2;
    const number = numberOffset + i + 1;
    drawQuestion(doc, q, cellX, yBar, fs, number);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: FractionQuestion[][],
  title: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${title} — Answer Key`, left, top + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const nameLabel = 'Name:';
  const nameLabelW = doc.getTextWidth(nameLabel);
  const nameLineEnd = right;
  const nameLineStart = nameLineEnd - 50;
  doc.text(nameLabel, nameLineStart - nameLabelW - 2, top + 6);
  if (studentName) doc.text(studentName, nameLineStart + 1, top + 5.5);
  doc.setLineWidth(0.3);
  doc.line(nameLineStart, top + 7, nameLineEnd, top + 7);
  doc.setLineWidth(0.5);
  doc.line(left, top + 10, right, top + 10);

  const allQuestions: FractionQuestion[] = pages.flat();
  const total = allQuestions.length;

  const cols = 5;
  const colW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rows = Math.max(1, Math.ceil(total / cols));
  const rowH = gridH / rows;
  const fs = Math.min(12, Math.max(8, Math.floor(rowH * 0.45)));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < total; i++) {
    const q = allQuestions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * colW + 2;
    const y = gridTop + row * rowH + rowH / 2 + (fs * 0.352778) * 0.35;
    // Answer key uses compact horizontal n/d notation.
    doc.text(`${i + 1}) ${q.answer.num}/${q.answer.den}`, x, y);
  }
}

export function generateFractionsPdf(opts: FractionPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let runningOffset = 0;
  opts.pages.forEach((qs, idx) => {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawPage(doc, qs, opts.title, opts.subtitle, opts.studentName, runningOffset);
    runningOffset += qs.length;
  });
  if (opts.includeAnswerKey) {
    doc.addPage('a4', 'portrait');
    drawAnswerKeyPage(doc, opts.pages, opts.title, opts.studentName);
  }
  return doc;
}
