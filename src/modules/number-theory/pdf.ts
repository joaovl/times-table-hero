import jsPDF from 'jspdf';
import type { NumberTheoryQuestion } from './logic';
import { LIST_SKILLS, answerString } from './logic';

export interface NumberTheoryPdfOptions {
  pages: NumberTheoryQuestion[][];
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

// Encoding-safe prompt for a single PDF cell. ² and ³ are WinAnsi-safe; √ is
// not — for square-root we either say "sqrt(N)" or draw a radical primitive.
// The text-mode prompt is what lands in the captured text stream the tests
// inspect. The radical primitive is only used for the actual figure (drawn
// via setLineWidth/line, never as text).
function promptText(q: NumberTheoryQuestion): string {
  switch (q.skill) {
    case 'factors':
      return `List the factors of ${q.n}:`;
    case 'common-factor':
      return `Common factors of ${q.n} and ${q.m}:`;
    case 'multiples':
      return `First ${q.count} multiples of ${q.base}:`;
    case 'factor-pair':
      return `Is ${q.m} a factor of ${q.n}?  (yes / no)`;
    case 'is-multiple':
      return `Is ${q.n} a multiple of ${q.m}?  (yes / no)`;
    case 'prime-recognize':
      return `Is ${q.n} prime?  (yes / no)`;
    case 'prime-list-19':
      return `Circle the primes:  ${q.candidates.join(',  ')}`;
    case 'square':
      return `${q.base}² =`;
    case 'cube':
      return `${q.base}³ =`;
    case 'square-root':
      // Text fallback when we choose not to draw the radical primitive.
      return `sqrt(${q.base}) =`;
  }
}

/**
 * Radical-line primitive — adapted from src/modules/times-tables/pdf.ts so
 * this module stays self-contained (no cross-module import). Draws a small
 * descender tick + main diagonal + overbar in front of the radicand. Returns
 * the x position where the overbar ends so the caller can place "=" after.
 *
 * Stroke weight scales with fs so the radical reads at the same weight as
 * the surrounding Helvetica numerals.
 */
function drawRadical(
  doc: jsPDF,
  startX: number,
  baselineY: number,
  fs: number,
  radicandStr: string
): { overbarEndX: number } {
  const radicandW = doc.getTextWidth(radicandStr);
  const ascentHeight = fs * 0.5;
  const tickLength = fs * 0.18;
  const overbarPadding = 0.8;

  const peakX = startX + tickLength;
  const peakY = baselineY + tickLength * 0.4; // peak slightly below baseline
  const tickStartX = startX;
  const tickStartY = baselineY - 0.5;
  const topX = peakX + fs * 0.32;
  const topY = baselineY - ascentHeight;

  const radicalStrokeWidth = Math.max(0.22, fs * 0.025);
  doc.setLineWidth(radicalStrokeWidth);
  doc.line(peakX, peakY, tickStartX, tickStartY); // short tick up-left
  doc.line(peakX, peakY, topX, topY); // main diagonal up-right
  const overbarEndX = topX + radicandW + overbarPadding * 2;
  doc.line(topX, topY, overbarEndX, topY); // overbar
  doc.text(radicandStr, topX + overbarPadding, baselineY);
  return { overbarEndX };
}

/** True if any selected question is a list-answer skill — drives 2-col layout. */
function needsListLayout(questions: NumberTheoryQuestion[]): boolean {
  return questions.some(q => (LIST_SKILLS as readonly string[]).includes(q.skill));
}

function drawCellSingleAnswer(
  doc: jsPDF,
  q: NumberTheoryQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  rowH: number,
  fs: number,
  num: number,
  drawRadicalForSqrt: boolean
) {
  const numStr = `${num}.`;
  const baselineY = cellY + rowH / 2 + (fs * 0.352778) * 0.35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);
  doc.text(numStr, cellX + 2, baselineY);
  const startX = cellX + 2 + doc.getTextWidth(numStr) + 1.5;

  let eqEndX: number;

  if (q.skill === 'square') {
    const baseStr = `${q.base}`;
    doc.text(baseStr, startX, baselineY);
    const baseW = doc.getTextWidth(baseStr);
    // The literal U+00B2 SUPERSCRIPT TWO is WinAnsi-safe, but rendering as
    // a smaller superscript reads more naturally on print.
    const supSize = fs * 0.6;
    doc.setFontSize(supSize);
    doc.text('2', startX + baseW + 0.4, baselineY - fs * 0.3);
    const supW = doc.getTextWidth('2');
    doc.setFontSize(fs);
    const eqStr = ' =';
    doc.text(eqStr, startX + baseW + 0.4 + supW + 0.5, baselineY);
    eqEndX = startX + baseW + 0.4 + supW + 0.5 + doc.getTextWidth(eqStr);
  } else if (q.skill === 'cube') {
    const baseStr = `${q.base}`;
    doc.text(baseStr, startX, baselineY);
    const baseW = doc.getTextWidth(baseStr);
    const supSize = fs * 0.6;
    doc.setFontSize(supSize);
    doc.text('3', startX + baseW + 0.4, baselineY - fs * 0.3);
    const supW = doc.getTextWidth('3');
    doc.setFontSize(fs);
    const eqStr = ' =';
    doc.text(eqStr, startX + baseW + 0.4 + supW + 0.5, baselineY);
    eqEndX = startX + baseW + 0.4 + supW + 0.5 + doc.getTextWidth(eqStr);
  } else if (q.skill === 'square-root') {
    if (drawRadicalForSqrt) {
      const radicandStr = `${q.base}`;
      const { overbarEndX } = drawRadical(doc, startX, baselineY, fs, radicandStr);
      const eqStr = ' =';
      doc.text(eqStr, overbarEndX + 0.5, baselineY);
      eqEndX = overbarEndX + 0.5 + doc.getTextWidth(eqStr);
    } else {
      // WinAnsi-safe fallback: write "sqrt(N) =".
      const txt = `sqrt(${q.base}) =`;
      doc.text(txt, startX, baselineY);
      eqEndX = startX + doc.getTextWidth(txt);
    }
  } else {
    // factor-pair / is-multiple / prime-recognize. Render the prompt text
    // inline; answer is yes/no on the rule.
    const txt = promptText(q);
    doc.text(txt, startX, baselineY);
    eqEndX = startX + doc.getTextWidth(txt);
  }

  const blankStart = eqEndX + 1.5;
  const blankEnd = Math.min(cellX + cellW - 1, blankStart + 12);
  if (blankEnd > blankStart) {
    doc.setLineWidth(0.3);
    doc.line(blankStart, baselineY + 0.6, blankEnd, baselineY + 0.6);
  }
}

function drawCellListAnswer(
  doc: jsPDF,
  q: NumberTheoryQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  rowH: number,
  fs: number,
  num: number
) {
  const numStr = `${num}.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  // Top: numbered prompt occupying its own line.
  const promptY = cellY + rowH * 0.4;
  doc.text(`${numStr} ${promptText(q)}`, cellX + 2, promptY);

  // Bottom: long answer rule running most of the cell width.
  const ruleY = cellY + rowH - 4;
  const ruleStart = cellX + 4;
  const ruleEnd = cellX + cellW - 4;
  doc.setLineWidth(0.3);
  doc.line(ruleStart, ruleY, ruleEnd, ruleY);
}

function drawPage(
  doc: jsPDF,
  questions: NumberTheoryQuestion[],
  title: string,
  subtitle: string,
  studentName?: string,
  numberOffset = 0,
  options?: { drawRadicalForSqrt?: boolean }
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

  const listLayout = needsListLayout(questions);
  // 2-col when any list-answer skill is present, 4-col otherwise.
  const cols = listLayout ? 2 : 4;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;
  // Font size shrinks with row count so a 24-cell page still fits.
  const fs = Math.min(14, Math.max(9, Math.floor(rowH * 0.4)));

  const drawRadicalForSqrt = options?.drawRadicalForSqrt ?? true;

  for (let i = 0; i < questions.length && i < cols * rows; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW;
    const cellY = gridTop + row * rowH;
    const num = numberOffset + i + 1;
    if (listLayout) {
      drawCellListAnswer(doc, q, cellX, cellY, cellW, rowH, fs, num);
    } else {
      drawCellSingleAnswer(
        doc,
        q,
        cellX,
        cellY,
        cellW,
        rowH,
        fs,
        num,
        drawRadicalForSqrt
      );
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: NumberTheoryQuestion[][],
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

  const all: NumberTheoryQuestion[] = pages.flat();
  const total = all.length;

  // List-answers (factors, multiples, common-factor, prime-list-19) can be
  // long — drop to 2 columns when any are present so they don't wrap.
  const hasList = all.some(q => (LIST_SKILLS as readonly string[]).includes(q.skill));
  const cols = hasList ? 2 : 5;
  const colW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rows = Math.max(1, Math.ceil(total / cols));
  const rowH = gridH / rows;
  const fs = Math.min(12, Math.max(8, Math.floor(rowH * 0.45)));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < total; i++) {
    const q = all[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * colW + 2;
    const y = gridTop + row * rowH + rowH / 2 + (fs * 0.352778) * 0.35;
    doc.text(`${i + 1}) ${answerString(q)}`, x, y);
  }
}

export function generateNumberTheoryPdf(
  opts: NumberTheoryPdfOptions
): jsPDF {
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
