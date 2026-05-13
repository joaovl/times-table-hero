import jsPDF from 'jspdf';
import { drawFilledSector } from '@/lib/svgPdf';
import type { FractionQuestion } from './logic';
import {
  skillOp,
  toMixed,
  isOpQuestion,
  isIdQuestion,
  isEqQuestion,
  isCmpQuestion,
  isMixedQuestion,
  isMulByWholeQuestion,
  isMixedMulWholeQuestion,
  isMulFracQuestion,
  isToDecimalQuestion,
  isFromDecimalQuestion,
  isMixedAddSubQuestion,
  isDivFracWholeQuestion,
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
//
// The fill of each shaded sector is delegated to `drawFilledSector` in
// `src/lib/svgPdf.ts` — the trig used to live inline here. The chord
// strokes and the outer circle stroke remain inline because they are
// fractions-specific (other consumers want different stroke patterns).
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
    if (i < shaded) {
      drawFilledSector(doc, cx, cy, r, a0, a1, [180, 180, 180]);
    }
    // Chord from centre to the start of this sector. We re-set the draw
    // colour each iteration because drawFilledSector touches setFillColor
    // but not setDrawColor — keeping this explicit avoids any future
    // surprise if the helper grows a draw-colour side effect.
    doc.setDrawColor(0);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
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

  if (isMulByWholeQuestion(q)) {
    // "1/4 x 6 = ____"  — × glyph is U+00D7 which IS in WinAnsi.
    cursor += drawFraction(doc, q.frac, cursor, y, fs) + 1;
    const mul = ' × ';
    doc.text(mul, cursor, y);
    cursor += doc.getTextWidth(mul) + 1;
    const wholeStr = String(q.whole);
    doc.text(wholeStr, cursor, y);
    cursor += doc.getTextWidth(wholeStr) + 2;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 22, y + 0.6);
    return;
  }

  if (isMixedMulWholeQuestion(q)) {
    // "2 1/3 x 4 = ____" — wider, lays out left-to-right.
    const wholeStr = String(q.mixed.whole);
    doc.text(wholeStr, cursor, y);
    cursor += doc.getTextWidth(wholeStr) + 2;
    cursor += drawFraction(doc, { num: q.mixed.num, den: q.mixed.den }, cursor, y, fs) + 1;
    const mul = ' × ';
    doc.text(mul, cursor, y);
    cursor += doc.getTextWidth(mul) + 1;
    const wStr = String(q.whole);
    doc.text(wStr, cursor, y);
    cursor += doc.getTextWidth(wStr) + 2;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 26, y + 0.6);
    return;
  }

  if (isMulFracQuestion(q)) {
    cursor += drawFraction(doc, q.a, cursor, y, fs) + 1;
    const mul = ' × ';
    doc.text(mul, cursor, y);
    cursor += doc.getTextWidth(mul) + 1;
    cursor += drawFraction(doc, q.b, cursor, y, fs) + 1;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 14, y + 0.6);
    return;
  }

  if (isToDecimalQuestion(q)) {
    // "1/4 as a decimal = ____"
    cursor += drawFraction(doc, { num: q.num, den: q.den }, cursor, y, fs) + 1;
    const label = ' = ';
    doc.text(label, cursor, y);
    cursor += doc.getTextWidth(label) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 22, y + 0.6);
    // Tiny suffix hint.
    const suf = ' (dec.)';
    doc.text(suf, cursor + 23, y);
    return;
  }

  if (isFromDecimalQuestion(q)) {
    // "0.25 = ___/___"
    const decStr = formatDecimal(q.decimal);
    doc.text(decStr, cursor, y);
    cursor += doc.getTextWidth(decStr) + 2;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    // Two-stack blank: short num blank over a bar over short den blank.
    const slotW = 8;
    doc.setLineWidth(0.3);
    doc.line(cursor, y - 2.5, cursor + slotW, y - 2.5);
    doc.line(cursor, y - 0.2, cursor + slotW, y - 0.2);
    doc.line(cursor, y + 2.1, cursor + slotW, y + 2.1);
    return;
  }

  if (isMixedAddSubQuestion(q)) {
    // "2 1/3 + 1 1/4 = ___"  — uses ASCII '+' or '-' (hyphen) so PDF-safe.
    const opStr = q.skill === 'add-mixed' ? ' + ' : ' - ';
    const aWholeStr = String(q.a.whole);
    doc.text(aWholeStr, cursor, y);
    cursor += doc.getTextWidth(aWholeStr) + 2;
    cursor += drawFraction(doc, { num: q.a.num, den: q.a.den }, cursor, y, fs) + 1;
    doc.text(opStr, cursor, y);
    cursor += doc.getTextWidth(opStr) + 1;
    const bWholeStr = String(q.b.whole);
    doc.text(bWholeStr, cursor, y);
    cursor += doc.getTextWidth(bWholeStr) + 2;
    cursor += drawFraction(doc, { num: q.b.num, den: q.b.den }, cursor, y, fs) + 1;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 22, y + 0.6);
    return;
  }

  if (isDivFracWholeQuestion(q)) {
    // "3/4 ÷ 2 = ___" — ÷ glyph is U+00F7, in WinAnsi.
    cursor += drawFraction(doc, q.frac, cursor, y, fs) + 1;
    const div = ' ÷ ';
    doc.text(div, cursor, y);
    cursor += doc.getTextWidth(div) + 1;
    const wholeStr = String(q.whole);
    doc.text(wholeStr, cursor, y);
    cursor += doc.getTextWidth(wholeStr) + 2;
    const eq = ' = ';
    doc.text(eq, cursor, y);
    cursor += doc.getTextWidth(eq) + 1;
    doc.setLineWidth(0.3);
    doc.line(cursor, y + 0.6, cursor + 18, y + 0.6);
    return;
  }
}

// Format a decimal as a short ASCII string. We only generate decimals
// from the common families (halves/quarters/fifths/tenths), so a fixed
// 2-decimal trim is sufficient and avoids floating-point noise like
// "0.3000000004". Trailing zeros after the point are stripped.
function formatDecimal(d: number): string {
  // toFixed(2) handles every value we emit (0.5, 0.25, 0.75, 0.1..0.9, 0.2, 0.4, 0.6, 0.8).
  const s = d.toFixed(2);
  // Strip trailing zeros and a dangling dot.
  return s.replace(/\.?0+$/, '') || '0';
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

  // Column count depends on the longest question shape on the page.
  // - mixed-mul-whole has the widest prompt ("2 1/3 × 4 = ___"), so we
  //   drop to 2 cols when any such question is present.
  // - Default is 3 cols — fractions need vertical room for stacked
  //   num/bar/den notation.
  // - 4 cols would be used for very short prompts (kept simple here; the
  //   spec calls out "4-col grid for short questions" but our short-prompt
  //   skills coexist with 3-col-width skills so we stick to the 3-col
  //   default unless a wide skill forces 2-col).
  const hasWide = questions.some(q => isMixedMulWholeQuestion(q) || isMixedAddSubQuestion(q));
  const cols = hasWide ? 2 : 3;
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
  if (isMulByWholeQuestion(q) || isMixedMulWholeQuestion(q)) {
    // Prefer mixed form for clarity in the printed key.
    const a = q.answer;
    if (a.whole !== undefined) {
      if (a.num === 0 || a.den === 0) return `${num}) ${a.whole}`;
      return `${num}) ${a.whole} ${a.num}/${a.den}`;
    }
    return `${num}) ${a.num}/${a.den}`;
  }
  if (isMulFracQuestion(q)) {
    return `${num}) ${q.answer.num}/${q.answer.den}`;
  }
  if (isToDecimalQuestion(q)) {
    return `${num}) ${formatDecimal(q.answer)}`;
  }
  if (isFromDecimalQuestion(q)) {
    return `${num}) ${q.num}/${q.den}`;
  }
  if (isMixedAddSubQuestion(q)) {
    const a = q.answer;
    if (a.whole !== undefined) {
      if (a.num === 0 || a.den === 0) return `${num}) ${a.whole}`;
      return `${num}) ${a.whole} ${a.num}/${a.den}`;
    }
    return `${num}) ${a.num}/${a.den}`;
  }
  if (isDivFracWholeQuestion(q)) {
    return `${num}) ${q.answer.num}/${q.answer.den}`;
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
