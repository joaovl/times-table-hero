import jsPDF from 'jspdf';
import type { NumberSenseQuestion } from './logic';
import {
  isPlaceValueQuestion,
  isRoundQuestion,
  isSequenceQuestion,
  isRomanQuestion,
  isOrderQuestion,
  isNegativeIntervalQuestion,
  isBidmasQuestion,
  answerText,
} from './logic';

export interface NumberSensePdfOptions {
  pages: NumberSenseQuestion[][];
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

// Format a number with thousands separators using en-GB locale. Comma
// separator is ASCII so the PDF stays safe.
function fmtThousands(n: number): string {
  return n.toLocaleString('en-GB');
}

// Render the question prompt as ASCII-safe text for the PDF. Mirrors
// `questionPromptText` from logic.ts but emits PDF-friendly punctuation
// (e.g. "Roman ___" instead of unicode arrows). Roman numerals are uppercase
// ASCII letters, which are safe in WinAnsi.
function pdfPromptText(q: NumberSenseQuestion): string {
  if (isPlaceValueQuestion(q)) {
    const digitStr = String(q.number)[q.digitIndex];
    return `Value of the ${digitStr} in ${fmtThousands(q.number)}?`;
  }
  if (isRoundQuestion(q)) {
    const label =
      q.nearest === 10 ? '10' :
      q.nearest === 100 ? '100' :
      q.nearest === 1000 ? '1,000' :
      q.nearest === 10000 ? '10,000' :
      q.nearest === 100000 ? '100,000' : '1,000,000';
    return `Round ${fmtThousands(q.number)} to the nearest ${label}.`;
  }
  if (isSequenceQuestion(q)) {
    return q.sequence
      .map((n, i) => (q.missingIndices.includes(i) ? '___' : fmtThousands(n)))
      .join(', ');
  }
  if (isRomanQuestion(q)) {
    return q.direction === 'r2n'
      ? `${q.prompt} = ___`
      : `${q.prompt} in Roman = ___`;
  }
  if (isNegativeIntervalQuestion(q)) {
    return `From ${q.from} to ${q.to}, how many? ___`;
  }
  if (isBidmasQuestion(q)) {
    return `${q.expression} = ___`;
  }
  // order-numbers
  return `Order smallest to largest: ${q.numbers.map(fmtThousands).join(', ')}`;
}

// Identify questions whose prompts are too long for a 4-col grid. Returns
// true for sequences (mostly fit, but show every term) and order-numbers
// (four numbers + label). Used to switch to a 2-col layout when any such
// question appears on a page.
function isLongPromptQuestion(q: NumberSenseQuestion): boolean {
  return (
    isSequenceQuestion(q) ||
    isOrderQuestion(q) ||
    isNegativeIntervalQuestion(q) ||
    isBidmasQuestion(q)
  );
}

// Wrap one logical line of text to fit a column width, breaking at spaces.
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
      // If a single word is wider than the column, force it onto its own line
      // anyway — better than dropping content.
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
  questions: NumberSenseQuestion[],
  title: string,
  subtitle: string,
  studentName: string | undefined,
  numberOffset: number
) {
  drawHeader(doc, title, subtitle, studentName);
  const left = MARGIN;
  const top = MARGIN;

  // 4-col default; switch to 2-col when any question on this page is a
  // long-prompt skill (sequence / order-numbers).
  const useLongLayout = questions.some(isLongPromptQuestion);
  const cols = useLongLayout ? 2 : 4;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / Math.max(rows, useLongLayout ? 8 : 10);

  // Font size based on prompt length / column count.
  const fs = useLongLayout ? 11 : 10;
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
    const fullPrompt = `${prefix}${pdfPromptText(q)}`;

    const innerW = cellW - 6;
    const lines = wrapLines(doc, fullPrompt, innerW);
    const lineH = fs * 0.45;

    // Draw wrapped prompt lines.
    let y = cellTop + lineH + 2;
    for (const line of lines) {
      doc.text(line, cellX, y);
      y += lineH;
    }

    // Answer slot: short blank line, indented slightly under the prompt.
    const slotY = y + 1.5;
    doc.setLineWidth(0.3);
    doc.line(cellX + 4, slotY, cellX + Math.min(innerW - 4, 60), slotY);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

// Render the answer-key text for a single question. ASCII only.
export function answerKeyText(q: NumberSenseQuestion, num: number): string {
  return `${num}) ${answerText(q)}`;
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: NumberSenseQuestion[][],
  title: string,
  studentName?: string
) {
  drawHeader(doc, `${title} — Answer Key`, '', studentName);
  const left = MARGIN;
  const top = MARGIN;

  const allQuestions: NumberSenseQuestion[] = pages.flat();
  const total = allQuestions.length;

  // Sequence and order-numbers answers can be long; use a 3-col grid so
  // commas don't bunch up.
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
    const q = allQuestions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + col * colW + 2;
    const text = answerKeyText(q, i + 1);
    // Wrap each entry within its column.
    const lines = wrapLines(doc, text, colW - 4);
    const lineH = fs * 0.45;
    const cellTop = gridTop + row * rowH;
    let y = cellTop + rowH / 2 - ((lines.length - 1) * lineH) / 2 + (fs * 0.352778) * 0.35;
    for (const line of lines) {
      doc.text(line, x, y);
      y += lineH;
    }
  }
}

export function generateNumberSensePdf(opts: NumberSensePdfOptions): jsPDF {
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
