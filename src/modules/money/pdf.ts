import jsPDF from 'jspdf';
import type { MoneyQuestion } from './logic';
import { formatMoney } from './logic';

export interface MoneyPdfOptions {
  pages: MoneyQuestion[][];
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

// PDF-safe glyph helpers. £ (U+00A3) and × (U+00D7) live in Helvetica's
// WinAnsi encoding so they render correctly; the math-minus U+2212 does not
// — we use ASCII hyphen-minus everywhere.
function pdfMoney(pence: number): string {
  return formatMoney(pence);
}

// Layout decision: a page that contains any multi-item question gets a
// 2-col grid with taller rows; everything else gets a 4-col grid.
function pageHasMultiItem(qs: MoneyQuestion[]): boolean {
  return qs.some(q => q.skill === 'multi-item');
}

function renderBinaryQuestion(q: MoneyQuestion, num: number): string {
  switch (q.skill) {
    case 'add-money':
      return `${num}.  ${pdfMoney(q.aPence)} + ${pdfMoney(q.bPence)} =`;
    case 'subtract-money':
      return `${num}.  ${pdfMoney(q.aPence)} - ${pdfMoney(q.bPence)} =`;
    case 'multiply-money':
      return `${num}.  ${q.bPence} × ${pdfMoney(q.aPence)} =`;
    case 'change':
      return `${num}.  Buy ${q.itemName} ${pdfMoney(q.pricePence)}, pay ${pdfMoney(q.paidPence)}. Change?`;
    case 'compare-prices':
      return `${num}.  Cheaper? A: ${q.itemAName} ${pdfMoney(q.aPence)}   B: ${q.itemBName} ${pdfMoney(q.bPence)}`;
    case 'multi-item':
      // Multi-item shouldn't reach here, but provide a sensible fallback.
      return `${num}.  Total: ${q.items.map(it => `${it.name} ${pdfMoney(it.pricePence)}`).join(', ')}`;
  }
}

function drawAnswerBlank(doc: jsPDF, x: number, y: number, width = 18) {
  doc.setLineWidth(0.3);
  doc.line(x, y + 0.6, x + width, y + 0.6);
}

// Format a question for the answer-key page.
function formatAnswer(q: MoneyQuestion): string {
  if (q.skill === 'compare-prices') {
    if (q.answer === 'equal') return 'equal';
    return q.answer;
  }
  return pdfMoney(q.answerPence);
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
  questions: MoneyQuestion[],
  title: string,
  subtitle: string,
  studentName: string | undefined,
  numberOffset: number
) {
  const left = MARGIN;
  const top = MARGIN;
  drawHeader(doc, title, subtitle, studentName);

  const useMulti = pageHasMultiItem(questions);
  const cols = useMulti ? 2 : 4;
  const fs = useMulti ? 11 : 11;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
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

    if (q.skill === 'multi-item') {
      // Multi-line list. Print the question header, then each item on its
      // own line, then a blank for the total.
      const headerY = cellTop + 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${num}.  Total cost?`, cellX, headerY);
      doc.setFont('helvetica', 'normal');
      const lineH = fs * 0.5;
      q.items.forEach((it, idx) => {
        const y = headerY + lineH + idx * lineH;
        doc.text(`  ${it.name}: ${pdfMoney(it.pricePence)}`, cellX, y);
      });
      const totalLineY = headerY + lineH + q.items.length * lineH + lineH * 0.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Total =', cellX, totalLineY);
      doc.setFont('helvetica', 'normal');
      const eqW = doc.getTextWidth('Total =');
      drawAnswerBlank(doc, cellX + eqW + 2, totalLineY, 28);
    } else {
      // Binary skill: single-line equation with a blank for the answer.
      const eq = renderBinaryQuestion(q, num);
      const baselineY = cellTop + rowH / 2 + (fs * 0.352778) * 0.35;
      doc.text(eq, cellX, baselineY);
      const eqW = doc.getTextWidth(eq);
      drawAnswerBlank(doc, cellX + eqW + 1.5, baselineY, 14);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: MoneyQuestion[][],
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

  const allQuestions: MoneyQuestion[] = pages.flat();
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
    doc.text(`${i + 1}) ${formatAnswer(q)}`, x, y);
  }
}

export function generateMoneyPdf(opts: MoneyPdfOptions): jsPDF {
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
