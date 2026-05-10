import jsPDF from 'jspdf';
import type { FractionQuestion } from './logic';
import {
  skillOp,
  toMixed,
  isOpQuestion,
  isIdQuestion,
  isEqQuestion,
  isCmpQuestion,
  isMixedQuestion,
} from './logic';

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

// Render a stacked fraction where one of num/den is shown as a blank line.
// Used by `eq` skill. Returns the width consumed.
function drawFractionWithBlank(
  doc: jsPDF,
  frac: { num: number; den: number },
  missing: 'num' | 'den',
  cx: number,
  cy: number,
  fs: number
): number {
  const numStr = missing === 'num' ? '' : String(frac.num);
  const denStr = missing === 'den' ? '' : String(frac.den);
  // Reserve space for a small blank line where the missing field would be.
  const blankW = fs * 0.45;
  const numW = missing === 'num' ? blankW : doc.getTextWidth(numStr);
  const denW = missing === 'den' ? blankW : doc.getTextWidth(denStr);
  const barW = Math.max(numW, denW) + 2;
  const lineH = fs * 0.42;
  const barLeft = cx;
  const barRight = cx + barW;

  if (missing === 'num') {
    const lineY = cy - 1.5;
    const lineL = barLeft + (barW - blankW) / 2;
    doc.setLineWidth(0.3);
    doc.line(lineL, lineY, lineL + blankW, lineY);
  } else {
    const numX = barLeft + (barW - numW) / 2;
    doc.text(numStr, numX, cy - 1);
  }

  doc.setLineWidth(0.4);
  doc.line(barLeft, cy + 0.4, barRight, cy + 0.4);

  if (missing === 'den') {
    const lineY = cy + lineH + 1;
    const lineL = barLeft + (barW - blankW) / 2;
    doc.setLineWidth(0.3);
    doc.line(lineL, lineY, lineL + blankW, lineY);
  } else {
    const denX = barLeft + (barW - denW) / 2;
    doc.text(denStr, denX, cy + lineH + 1);
  }

  return barW;
}

// Draw a circle of radius r centred at (cx, cy), partitioned into `total`
// equal sectors with `shaded` of them filled grey. We approximate each
// sector's fill with a triangle from the centre to the two chord endpoints,
// then stroke the sector boundary lines and the outer circle. At the
// total counts we use (<= 8), this reads cleanly as "n of total slices".
function drawCircleFigure(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  total: number,
  shaded: number
) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  for (let i = 0; i < total; i++) {
    const a0 = (i / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / total) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    if (i < shaded) {
      doc.setFillColor(180, 180, 180);
      doc.triangle(cx, cy, x0, y0, x1, y1, 'F');
    }
    doc.setDrawColor(0);
    doc.line(cx, cy, x0, y0);
  }
  doc.circle(cx, cy, r, 'S');
}

// Draw a rectangle grid of `rows × cols` cells with the first `shaded`
// cells filled grey. Lays out within a bounding box of width `w` and
// height `h`, anchored at (x, y).
function drawRectFigure(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  total: number,
  shaded: number,
  rows: number,
  cols: number
) {
  const cellW = w / cols;
  const cellH = h / rows;
  for (let i = 0; i < total; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = x + c * cellW;
    const cy = y + r * cellH;
    if (i < shaded) {
      doc.setFillColor(180, 180, 180);
      doc.rect(cx, cy, cellW, cellH, 'FD');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(cx, cy, cellW, cellH, 'D');
    }
  }
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

  if (isOpQuestion(q)) {
    const op = skillOp(q.skill);
    const opStr = ` ${opSymbol(op)} `;
    cursor += drawFraction(doc, q.a, cursor, y, fs) + 1;
    const opW = doc.getTextWidth(opStr);
    doc.text(opStr, cursor, y);
    cursor += opW + 1;
    cursor += drawFraction(doc, q.b, cursor, y, fs) + 1;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 14, y + 0.6);
    return;
  }

  if (isIdQuestion(q)) {
    const figSize = fs * 1.4;
    const figLeft = cursor;
    const figTop = y - figSize / 2 - 0.5;
    if (q.figure === 'circle') {
      const r = figSize / 2 - 0.5;
      const cx = figLeft + r + 0.5;
      const cy = y;
      drawCircleFigure(doc, cx, cy, r, q.total, q.shaded);
      cursor = cx + r + 2;
    } else {
      const rows = q.rows ?? 1;
      const cols = q.cols ?? q.total;
      const ratio = rows / Math.max(cols, 1);
      const w = figSize;
      const h = Math.max(figSize * ratio, 4);
      drawRectFigure(doc, figLeft, figTop, w, h, q.total, q.shaded, rows, cols);
      cursor = figLeft + w + 2;
    }
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    // Answer slot: two short stacked blanks so the kid writes num/den.
    const slotW = 8;
    doc.setLineWidth(0.3);
    doc.line(cursor, y - 2.5, cursor + slotW, y - 2.5);
    doc.line(cursor, y - 0.2, cursor + slotW, y - 0.2);
    doc.line(cursor, y + 2.1, cursor + slotW, y + 2.1);
    return;
  }

  if (isEqQuestion(q)) {
    cursor += drawFraction(doc, q.source, cursor, y, fs) + 1;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    cursor += drawFractionWithBlank(doc, q.target, q.missing, cursor, y, fs);
    return;
  }

  if (isCmpQuestion(q)) {
    cursor += drawFraction(doc, q.a, cursor, y, fs) + 2;
    // Small box where the kid writes the comparison symbol.
    const boxW = 8;
    const boxH = 8;
    doc.setLineWidth(0.3);
    doc.rect(cursor, y - boxH / 2, boxW, boxH, 'D');
    cursor += boxW + 2;
    cursor += drawFraction(doc, q.b, cursor, y, fs) + 1;
    return;
  }

  if (isMixedQuestion(q)) {
    if (q.direction === 'to-mixed') {
      cursor += drawFraction(doc, q.improper, cursor, y, fs) + 1;
      const eq = ' = ';
      doc.text(eq, cursor, y);
      cursor += doc.getTextWidth(eq) + 1;
      doc.setLineWidth(0.3);
      doc.line(cursor, y + 0.6, cursor + 22, y + 0.6);
    } else {
      const wholeStr = String(q.mixed.whole);
      doc.text(wholeStr, cursor, y);
      cursor += doc.getTextWidth(wholeStr) + 2;
      cursor += drawFraction(doc, { num: q.mixed.num, den: q.mixed.den }, cursor, y, fs) + 1;
      const eq = ' = ';
      doc.text(eq, cursor, y);
      cursor += doc.getTextWidth(eq) + 1;
      cursor += drawFractionWithBlank(
        doc,
        { num: 0, den: q.improper.den },
        'num',
        cursor,
        y,
        fs
      );
    }
    return;
  }
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
    const cellTop = gridTop + row * rowH;
    const yBar = cellTop + rowH / 2;
    const number = numberOffset + i + 1;
    drawQuestion(doc, q, cellX, yBar, fs, number);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

// Compose the answer key string for a single question. ASCII only.
export function answerKeyText(q: FractionQuestion, num: number): string {
  if (isOpQuestion(q)) {
    return `${num}) ${q.answer.num}/${q.answer.den}`;
  }
  if (isIdQuestion(q)) {
    return `${num}) ${q.answer.num}/${q.answer.den}`;
  }
  if (isEqQuestion(q)) {
    return `${num}) ${q.answer}`;
  }
  if (isCmpQuestion(q)) {
    return `${num}) ${q.answer}`;
  }
  if (isMixedQuestion(q)) {
    if (q.direction === 'to-mixed') {
      const m = toMixed(q.improper);
      if (m.num === 0) return `${num}) ${m.whole}`;
      return `${num}) ${m.whole} ${m.num}/${m.den}`;
    }
    return `${num}) ${q.improper.num}/${q.improper.den}`;
  }
  return `${num}) ?`;
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
    doc.text(answerKeyText(q, i + 1), x, y);
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
