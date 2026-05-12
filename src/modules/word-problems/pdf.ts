import jsPDF from 'jspdf';
import type { WordQuestion } from './logic';
import { expectedAnswerString } from './logic';

export interface WordPdfOptions {
  pages: WordQuestion[][];
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

// Single column — prompts are long, they need the full page width.
const COLS = 1;

/**
 * Word-wrap a string so each line fits in maxWidth (in mm). Uses jsPDF's
 * getTextWidth, splitting on whitespace.
 */
function wrap(doc: jsPDF, text: string, maxWidth: number): string[] {
  // Use jsPDF's built-in splitTextToSize when available; fall back to a
  // simple word splitter (the FakeJsPDF used in tests doesn't implement it).
  const splitter = (doc as unknown as { splitTextToSize?: (t: string, w: number) => string[] }).splitTextToSize;
  if (typeof splitter === 'function') {
    const result = splitter.call(doc, text, maxWidth);
    return Array.isArray(result) ? result : [String(result)];
  }
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current === '' ? word : `${current} ${word}`;
    if (doc.getTextWidth(test) <= maxWidth || current === '') {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

function drawQuestionCell(
  doc: jsPDF,
  q: WordQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  // Question number prefix + prompt body, wrapped to the cell width.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const numLabel = `${num}. `;
  const numW = doc.getTextWidth(numLabel);
  const promptWidth = cellW - 4 - numW;

  const lines = wrap(doc, q.prompt, promptWidth);
  const lineH = 5.5;
  const topY = cellY + 6;
  doc.text(numLabel, cellX + 2, topY);
  lines.forEach((line, i) => {
    doc.text(line, cellX + 2 + numW, topY + i * lineH);
  });

  // Blank answer line. ~60mm wide.
  const answerLabel = 'Answer:';
  const answerLabelW = doc.getTextWidth(answerLabel);
  const answerLineWidth = 60;
  const answerY = topY + lines.length * lineH + 8;
  doc.text(answerLabel, cellX + 2, answerY);
  doc.setLineWidth(0.3);
  doc.line(
    cellX + 2 + answerLabelW + 2,
    answerY + 0.6,
    cellX + 2 + answerLabelW + 2 + answerLineWidth,
    answerY + 0.6
  );

  // Optional working-space box below the answer line.
  const workTop = answerY + 6;
  const workBottom = cellY + cellH - 4;
  if (workBottom - workTop > 6) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('Working:', cellX + 2, workTop);
    doc.setTextColor(0);
    doc.setFontSize(12);
  }
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  studentName: string | undefined,
  top: number,
  left: number,
  right: number
) {
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
}

function drawPage(
  doc: jsPDF,
  questions: WordQuestion[],
  title: string,
  subtitle: string,
  studentName: string | undefined,
  numberOffset: number
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  drawHeader(doc, title, subtitle, studentName, top, left, right);

  const cols = COLS;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW;
    const cellY = gridTop + row * rowH;
    drawQuestionCell(doc, q, cellX, cellY, cellW, rowH, numberOffset + i + 1);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: WordQuestion[][],
  title: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${title} - Answer Key`, left, top + 6);

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

  const allQuestions: WordQuestion[] = pages.flat();
  const total = allQuestions.length;

  // 2 columns — word answers can be wider than arithmetic ones (e.g. "£3.50",
  // "175 cm").
  const cols = 2;
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
    doc.text(`${i + 1}) ${expectedAnswerString(q)}`, x, y);
  }
}

export function generateWordPdf(opts: WordPdfOptions): jsPDF {
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
