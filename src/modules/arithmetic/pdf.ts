import jsPDF from 'jspdf';
import type { ArithQuestion } from './logic';

export interface ArithPdfOptions {
  pages: ArithQuestion[][];
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

// PDF-safe operation glyph. Uses ASCII hyphen-minus (U+002D) for subtract
// because Helvetica's WinAnsi encoding has no glyph for the math-minus
// character U+2212 — it would otherwise render as a stray quote mark.
// '×' (U+00D7) and '+' are both in WinAnsi.
function symbol(op: 'add' | 'subtract' | 'multiply'): string {
  return op === 'add' ? '+' : op === 'subtract' ? '-' : '×';
}

function maxOperandDigits(qs: ArithQuestion[]): number {
  let max = 1;
  for (const q of qs) {
    max = Math.max(max, String(q.operand1).length, String(q.operand2).length);
  }
  return max;
}

// 4-col grid for every digit size; font shrinks as operand digits grow so
// the question still fits its cell. Rows derive from count so every
// requested question gets a cell — renderer never silently drops.
function gridSpec(maxDigits: number, count: number): { cols: number; rows: number; fs: number } {
  const cols = 4;
  let fs: number;
  if (maxDigits <= 2) fs = 14;
  else if (maxDigits === 3) fs = 13;
  else fs = 11;          // 4-5 digit column form fits at fs=11 in a 4-col grid
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows, fs };
}

function drawHorizontal(doc: jsPDF, q: ArithQuestion, x: number, y: number, num: number) {
  const eq = `${num}.  ${q.operand1} ${symbol(q.op)} ${q.operand2} =`;
  doc.text(eq, x, y);
  const eqW = doc.getTextWidth(eq);
  const blankStart = x + eqW + 1.5;
  const blankEnd = blankStart + 14;
  doc.setLineWidth(0.3);
  doc.line(blankStart, y + 0.6, blankEnd, y + 0.6);
}

function drawColumn(doc: jsPDF, q: ArithQuestion, x: number, yTop: number, fs: number, num: number) {
  // Question number sits on the line above the operand stack.
  const numStr = `${num}.`;
  doc.text(numStr, x, yTop);

  const a = String(q.operand1);
  const b = String(q.operand2);
  const width = Math.max(a.length, b.length);
  const charW = fs * 0.55;
  const colW = (width + 1) * charW;
  // Push the column itself right by the width of the number prefix.
  const colX = x + doc.getTextWidth(numStr) + 1.5;

  const lineH = fs * 0.5;
  const aY = yTop + lineH;
  const aX = colX + colW - a.length * charW;
  doc.text(a, aX, aY);

  const symY = aY + lineH;
  doc.text(symbol(q.op), colX, symY);
  const bX = colX + colW - b.length * charW;
  doc.text(b, bX, symY);

  const ruleY = symY + 1.5;
  doc.setLineWidth(0.4);
  doc.line(colX, ruleY, colX + colW, ruleY);
}

function drawPage(
  doc: jsPDF,
  questions: ArithQuestion[],
  title: string,
  subtitle: string,
  studentName?: string,
  numberOffset = 0
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

  const md = maxOperandDigits(questions);
  const useColumn = md >= 4;
  const { cols, rows, fs } = gridSpec(md, questions.length);
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length && i < cols * rows; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW + 2;
    const cellTop = gridTop + row * rowH;
    const num = numberOffset + i + 1;
    if (useColumn) {
      drawColumn(doc, q, cellX, cellTop + 4, fs, num);
    } else {
      const baselineY = cellTop + rowH / 2 + (fs * 0.352778) * 0.35;
      drawHorizontal(doc, q, cellX, baselineY, num);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: ArithQuestion[][],
  title: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  // Header (same chrome as a question page)
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

  // Flatten all questions, numbered 1..N continuously across pages.
  const allQuestions: ArithQuestion[] = pages.flat();
  const total = allQuestions.length;

  const cols = 5;
  const colW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rows = Math.max(1, Math.ceil(total / cols));
  const rowH = gridH / rows;
  // Cap row height for legibility; if too many rows, font shrinks
  const fs = Math.min(12, Math.max(8, Math.floor(rowH * 0.45)));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < total; i++) {
    const q = allQuestions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * colW + 2;
    const y = gridTop + row * rowH + rowH / 2 + (fs * 0.352778) * 0.35;
    doc.text(`${i + 1}) ${q.answer}`, x, y);
  }
}

export function generateArithPdf(opts: ArithPdfOptions): jsPDF {
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
