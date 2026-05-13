import jsPDF from 'jspdf';
import type { RatioQuestion } from './logic';
import { answerText, questionPromptText } from './logic';

export interface RatioPdfOptions {
  pages: RatioQuestion[][];
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

function wrapLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  studentName?: string
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
}

function drawPage(
  doc: jsPDF,
  questions: RatioQuestion[],
  title: string,
  subtitle: string,
  studentName: string | undefined,
  numberOffset: number
) {
  drawHeader(doc, title, subtitle, studentName);
  const left = MARGIN;
  const top = MARGIN;
  const cols = 2;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / Math.max(rows, 8);

  const fs = 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW + 2;
    const cellTop = gridTop + row * rowH;
    const num = numberOffset + i + 1;
    const prefix = `${num}.  `;
    const fullPrompt = `${prefix}${questionPromptText(q)}`;
    const innerW = cellW - 6;
    const lines = wrapLines(doc, fullPrompt, innerW);
    const lineH = fs * 0.45;

    let y = cellTop + lineH + 2;
    for (const line of lines) {
      doc.text(line, cellX, y);
      y += lineH;
    }

    // Answer slot.
    const slotY = y + 1.5;
    doc.setLineWidth(0.3);
    doc.line(cellX + 4, slotY, cellX + Math.min(innerW - 4, 70), slotY);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

export function answerKeyText(q: RatioQuestion, num: number): string {
  return `${num}) ${answerText(q)}`;
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: RatioQuestion[][],
  title: string,
  studentName?: string
) {
  drawHeader(doc, `${title} — Answer Key`, '', studentName);
  const left = MARGIN;
  const top = MARGIN;

  const all = pages.flat();
  const total = all.length;
  const cols = 3;
  const colW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rows = Math.max(1, Math.ceil(total / cols));
  const rowH = gridH / rows;
  const fs = Math.min(11, Math.max(8, Math.floor(rowH * 0.45)));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < total; i++) {
    const q = all[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * colW + 2;
    const text = answerKeyText(q, i + 1);
    const lines = wrapLines(doc, text, colW - 4);
    const lineH = fs * 0.45;
    const cellTop = gridTop + row * rowH;
    let y = cellTop + rowH / 2 - ((lines.length - 1) * lineH) / 2 + fs * 0.352778 * 0.35;
    for (const line of lines) {
      doc.text(line, x, y);
      y += lineH;
    }
  }
}

export function generateRatioPdf(opts: RatioPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let running = 0;
  opts.pages.forEach((qs, idx) => {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawPage(doc, qs, opts.title, opts.subtitle, opts.studentName, running);
    running += qs.length;
  });
  if (opts.includeAnswerKey) {
    doc.addPage('a4', 'portrait');
    drawAnswerKeyPage(doc, opts.pages, opts.title, opts.studentName);
  }
  return doc;
}
