import jsPDF from 'jspdf';
import type { TimeQuestion, TimeReadQuestion, TimeArithQuestion } from './logic';
import { expectedAnswerString, formatArithEquation } from './logic';

export interface TimePdfOptions {
  pages: TimeQuestion[][];
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

// Grid layout: 4 columns, capacity tuned to 10/15/20 questions per page.
const COLS = 4;

/**
 * Draw an analog clock using only jsPDF primitives (no SVG embedding).
 * Coordinates are in mm. centerX/centerY is the centre of the clock face;
 * radius is the face radius.
 */
function drawClock(
  doc: jsPDF,
  q: TimeReadQuestion,
  centerX: number,
  centerY: number,
  radius: number
) {
  // Face circle.
  doc.setLineWidth(0.4);
  doc.setDrawColor(0);
  doc.circle(centerX, centerY, radius);

  // 12 hour ticks. Each tick is a short line near the face perimeter.
  doc.setLineWidth(0.5);
  for (let h = 0; h < 12; h++) {
    const angle = (h * 30) * (Math.PI / 180); // 0° points up
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const inner = radius - 2.2;
    const outer = radius - 0.4;
    const x1 = centerX + inner * sin;
    const y1 = centerY - inner * cos;
    const x2 = centerX + outer * sin;
    const y2 = centerY - outer * cos;
    doc.line(x1, y1, x2, y2);
  }

  // Hour numerals. Helvetica's WinAnsi covers 0-9 — encoding safe.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(Math.max(6, Math.round(radius * 0.6)));
  const numeralRadius = radius - 4.2;
  for (let h = 1; h <= 12; h++) {
    const angle = (h * 30) * (Math.PI / 180);
    const x = centerX + numeralRadius * Math.sin(angle);
    const y = centerY - numeralRadius * Math.cos(angle);
    // jsPDF anchors text at baseline; nudge down slightly for visual centring.
    doc.text(String(h), x, y + (radius * 0.18), { align: 'center', baseline: 'middle' });
  }

  // Hands. Hour hand: 30°/hour + 0.5°/minute. Minute hand: 6°/minute.
  const h12 = ((q.hours % 12) + 12) % 12;
  const hourAngle = (h12 * 30 + q.minutes * 0.5) * (Math.PI / 180);
  const minuteAngle = (q.minutes * 6) * (Math.PI / 180);

  const hourLen = radius * 0.55;
  const minuteLen = radius * 0.85;

  doc.setLineWidth(1.1);
  doc.line(
    centerX,
    centerY,
    centerX + hourLen * Math.sin(hourAngle),
    centerY - hourLen * Math.cos(hourAngle)
  );
  doc.setLineWidth(0.7);
  doc.line(
    centerX,
    centerY,
    centerX + minuteLen * Math.sin(minuteAngle),
    centerY - minuteLen * Math.cos(minuteAngle)
  );

  // Center pin.
  doc.setFillColor(0, 0, 0);
  doc.circle(centerX, centerY, 0.7, 'F');
}

function drawReadCell(
  doc: jsPDF,
  q: TimeReadQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  // Question number at the top-left of the cell.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 5);

  // Clock occupies most of the cell. Leave room for the answer line below.
  const answerLineH = 7;
  const clockBoxH = cellH - answerLineH - 6; // top padding for the number
  const clockBoxW = cellW - 4;
  const radius = Math.max(6, Math.min(clockBoxH, clockBoxW) / 2 - 1);
  const centerX = cellX + cellW / 2;
  const centerY = cellY + 6 + clockBoxH / 2;
  drawClock(doc, q, centerX, centerY, radius);

  // Answer line: short underline near the bottom of the cell.
  const lineY = cellY + cellH - 3;
  const lineW = Math.min(cellW * 0.6, 26);
  const lineX1 = centerX - lineW / 2;
  const lineX2 = centerX + lineW / 2;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawArithCell(
  doc: jsPDF,
  q: TimeArithQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  // Question number at the top-left of the cell.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 5);

  // Equation rendered as plain text, centred horizontally in the cell.
  // Helvetica WinAnsi covers all glyphs used here (digits, ':', '+', '-',
  // letters, space) — encoding-safe.
  const centerX = cellX + cellW / 2;
  const eqY = cellY + cellH / 2 - 2;

  // Scale font size to keep the equation inside the cell. Start at 11 and
  // shrink in 1pt steps if it overflows.
  const eq = formatArithEquation(q);
  let fs = 11;
  doc.setFont('helvetica', 'bold');
  while (fs > 7) {
    doc.setFontSize(fs);
    if (doc.getTextWidth(eq) <= cellW - 4) break;
    fs -= 1;
  }
  doc.setFontSize(fs);
  doc.text(eq, centerX, eqY, { align: 'center', baseline: 'middle' });

  // Answer line below the equation.
  const lineY = cellY + cellH - 3;
  const lineW = Math.min(cellW * 0.6, 30);
  const lineX1 = centerX - lineW / 2;
  const lineX2 = centerX + lineW / 2;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawCell(
  doc: jsPDF,
  q: TimeQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  if (q.skill === 'arith') {
    drawArithCell(doc, q, cellX, cellY, cellW, cellH, num);
  } else {
    drawReadCell(doc, q, cellX, cellY, cellW, cellH, num);
  }
}

function drawPage(
  doc: jsPDF,
  questions: TimeQuestion[],
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

  const cols = COLS;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;

  for (let i = 0; i < questions.length && i < cols * rows; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW;
    const cellY = gridTop + row * rowH;
    const num = numberOffset + i + 1;
    drawCell(doc, q, cellX, cellY, cellW, rowH, num);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: TimeQuestion[][],
  title: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  // Header (same chrome as a question page).
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

  const allQuestions: TimeQuestion[] = pages.flat();
  const total = allQuestions.length;

  // Time-arith answers ("4:05 PM") are wider than read-clock ones ("3:45")
  // so we drop from 5 columns to 4 when any arith question is present.
  const hasArith = allQuestions.some(q => q.skill === 'arith');
  const cols = hasArith ? 4 : 5;
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

export function generateTimePdf(opts: TimePdfOptions): jsPDF {
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
