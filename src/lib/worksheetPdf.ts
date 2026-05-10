import jsPDF from 'jspdf';
import type { Question } from './gameLogic';

export type PdfQuestion = Question;

export interface WorksheetPdfOptions {
  pages: PdfQuestion[][];
  tablesLabel: string;
  questionCount: number;
  studentName?: string;
}

const A4_W = 210;
const A4_H = 297;
const MARGIN = 15;
const PRINT_W = A4_W - MARGIN * 2;
const PRINT_H = A4_H - MARGIN * 2;
const HEADER_H = 22;
const FOOTER_H = 12;

function fontSizeForRows(rows: number): number {
  if (rows <= 4) return 20;
  if (rows <= 8) return 17;
  if (rows <= 12) return 14;
  if (rows <= 16) return 12;
  return 11;
}

function drawPage(
  doc: jsPDF,
  questions: PdfQuestion[],
  questionCount: number,
  tablesLabel: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Maths Challenge', left, top + 6);

  // Name field
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

  // Separator
  doc.setLineWidth(0.5);
  doc.line(left, top + 10, right, top + 10);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${questionCount} Questions — Testing: ${tablesLabel}`, left, top + 15);
  doc.setTextColor(0);

  // Questions grid
  const cols = 5;
  const rows = Math.ceil(questionCount / cols);
  const colW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;
  const fs = fontSizeForRows(rows);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * colW;
    const cellCenterY = gridTop + row * rowH + rowH / 2;
    const baselineY = cellCenterY + (fs * 0.352778) * 0.35;

    let eqEndX: number;

    if (q.kind === 'binary') {
      const symbol = q.op === 'multiply' ? '×' : '÷';
      const eq = `${q.operand1} ${symbol} ${q.operand2} =`;
      doc.text(eq, cellX + 1, baselineY);
      eqEndX = cellX + 1 + doc.getTextWidth(eq);
    } else if (q.op === 'square') {
      const baseStr = `${q.operand}`;
      doc.text(baseStr, cellX + 1, baselineY);
      const baseW = doc.getTextWidth(baseStr);
      const supSize = fs * 0.6;
      doc.setFontSize(supSize);
      doc.text('2', cellX + 1 + baseW + 0.4, baselineY - fs * 0.3);
      const supW = doc.getTextWidth('2');
      doc.setFontSize(fs);
      const eqStr = ' =';
      doc.text(eqStr, cellX + 1 + baseW + 0.4 + supW + 0.5, baselineY);
      eqEndX = cellX + 1 + baseW + 0.4 + supW + 0.5 + doc.getTextWidth(eqStr);
    } else {
      const radicandStr = `${q.operand}`;
      const radicandW = doc.getTextWidth(radicandStr);
      const hookHeight = fs * 0.4;
      const hookWidth = fs * 0.18;
      const overbarPadding = 0.6;

      const hookBottomX = cellX + 1;
      const hookBottomY = baselineY;
      const hookTopX = hookBottomX + hookWidth;
      const hookTopY = baselineY - hookHeight;
      const overbarStartX = hookTopX;
      const overbarEndX = hookTopX + radicandW + overbarPadding * 2;
      const overbarY = hookTopY;

      doc.setLineWidth(0.3);
      doc.line(hookBottomX, hookBottomY, hookTopX, hookTopY);
      doc.line(overbarStartX, overbarY, overbarEndX, overbarY);

      doc.text(radicandStr, hookTopX + overbarPadding, baselineY);
      const eqStr = ' =';
      doc.text(eqStr, overbarEndX + 0.5, baselineY);
      eqEndX = overbarEndX + 0.5 + doc.getTextWidth(eqStr);
    }

    const blankStart = eqEndX + 1.5;
    const blankEnd = Math.min(cellX + colW - 1, blankStart + 10);
    if (blankEnd > blankStart) {
      doc.setLineWidth(0.3);
      doc.line(blankStart, baselineY + 0.6, blankEnd, baselineY + 0.6);
    }
  }

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

export function generateWorksheetPdf({
  pages,
  tablesLabel,
  questionCount,
  studentName,
}: WorksheetPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  pages.forEach((questions, idx) => {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawPage(doc, questions, questionCount, tablesLabel, studentName);
  });
  return doc;
}
