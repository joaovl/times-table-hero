import jsPDF from 'jspdf';
import type { DecimalsQuestion, RoundQuestion } from './logic';
import {
  formatDecimal,
  isAddSubQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isIdentifyQuestion,
  isPercentQuestion,
  isRoundQuestion,
} from './logic';

export interface DecimalsPdfOptions {
  pages: DecimalsQuestion[][];
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

// Helvetica WinAnsi has only ½ (U+00BD), ¼ (U+00BC) and ¾ (U+00BE).
// Other fractions (e.g. ⅕, ⅖) must use the textual "1/5" form. Returning
// null means "fall back to text"; the caller composes "n/d" in that case.
function pdfFractionGlyph(num: number, den: number): string | null {
  if (num === 1 && den === 2) return '½'; // ½
  if (num === 1 && den === 4) return '¼'; // ¼
  if (num === 3 && den === 4) return '¾'; // ¾
  return null;
}

// Render a fraction as either the WinAnsi glyph (½/¼/¾) or as "n/d" text.
// Used inline in the question prompt and in the answer key.
function fractionText(num: number, den: number): string {
  const glyph = pdfFractionGlyph(num, den);
  if (glyph) return glyph;
  return `${num}/${den}`;
}

// Symbol used in the add/subtract question text. ASCII hyphen-minus for
// subtraction (the math-minus U+2212 isn't in WinAnsi).
function addSubSymbol(sign: '+' | '-'): string {
  return sign;
}

// Format the question stem (everything left of the answer slot).
function questionText(q: DecimalsQuestion): string {
  if (isIdentifyQuestion(q)) {
    // e.g. "0.3 as a fraction ="
    const dp =
      q.skill === 'identify-tenths' ? 1 : q.skill === 'identify-hundredths' ? 2 : 3;
    return `${formatDecimal(q.decimal, dp)} as a fraction =`;
  }
  if (isRoundQuestion(q)) {
    const targetLabel = q.precision === 0 ? 'whole number' : '1 dp';
    const sourceDp = q.skill === 'round-1dp' ? 1 : 2;
    return `Round ${formatDecimal(q.decimal, sourceDp)} to nearest ${targetLabel} =`;
  }
  if (isFractionDecimalQuestion(q)) {
    if (q.skill === 'fraction-to-decimal') {
      return `${fractionText(q.num, q.den)} as a decimal =`;
    }
    // decimal-to-fraction
    return `${formatDecimal(q.decimal, decimalDp(q.decimal))} as a fraction =`;
  }
  if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') {
      return `${q.percent}% as a fraction =`;
    }
    if (q.skill === 'percent-decimal') {
      return `${q.percent}% as a decimal =`;
    }
    // decimal-percent
    return `${formatDecimal(q.decimal, decimalDp(q.decimal))} as a % =`;
  }
  if (isAddSubQuestion(q)) {
    const dp = Math.max(decimalDp(q.a), decimalDp(q.b));
    return `${formatDecimal(q.a, dp)} ${addSubSymbol(q.sign)} ${formatDecimal(q.b, dp)} =`;
  }
  // compare — caller renders separately, but we provide a fallback.
  if (isCompareQuestion(q)) {
    return `Order: ${q.decimals.map(d => formatDecimal(d, decimalDp(d))).join(', ')}`;
  }
  return '';
}

// Number of decimal places to print a value with. We honour the natural dp
// of the value (e.g. 0.4 prints as "0.4", 0.45 as "0.45") so the kid sees
// place value, not artificial trailing zeros.
function decimalDp(n: number): number {
  if (Number.isInteger(n)) return 0;
  const s = n.toString();
  const dot = s.indexOf('.');
  if (dot === -1) return 0;
  return Math.min(3, s.length - dot - 1);
}

function drawShortQuestion(
  doc: jsPDF,
  q: DecimalsQuestion,
  x: number,
  y: number,
  num: number,
  slotW: number
) {
  const prefix = `${num}.  `;
  doc.text(prefix, x, y);
  const prefixW = doc.getTextWidth(prefix);
  const stem = questionText(q);
  doc.text(stem, x + prefixW, y);
  const stemW = doc.getTextWidth(stem);
  const slotStart = x + prefixW + stemW + 1.5;
  const slotEnd = slotStart + slotW;
  doc.setLineWidth(0.3);
  doc.line(slotStart, y + 0.6, slotEnd, y + 0.6);
}

function drawCompareQuestion(
  doc: jsPDF,
  q: ReturnType<typeof asCompare>,
  x: number,
  y: number,
  num: number,
  slotW: number
) {
  const prefix = `${num}.  Order: `;
  doc.text(prefix, x, y);
  const prefixW = doc.getTextWidth(prefix);
  const list = q.decimals.map(d => formatDecimal(d, decimalDp(d))).join(', ');
  doc.text(list, x + prefixW, y);
  // Second line: answer slot for the four values written in order.
  const lineY = y + 6;
  doc.setLineWidth(0.3);
  doc.line(x + prefixW, lineY, x + prefixW + slotW, lineY);
}

// Narrow helper for the compare branch — silences the union without using
// `as` casts littered through drawCompareQuestion.
function asCompare(q: DecimalsQuestion): import('./logic').CompareDecimalsQuestion {
  // Caller guarantees this. Throw rather than silently mis-typing if misused.
  if (q.skill !== 'compare-decimals') throw new Error('not a compare question');
  return q;
}

function drawPage(
  doc: jsPDF,
  questions: DecimalsQuestion[],
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

  // Compare questions need a wide line, so they get a 2-col layout. Other
  // skills get a 4-col grid. When a page mixes both, we lay out everything
  // in the 2-col layout (the safer common denominator) so nothing overflows.
  const hasCompare = questions.some(q => q.skill === 'compare-decimals');
  const cols = hasCompare ? 2 : 4;
  const rows = Math.max(1, Math.ceil(questions.length / cols));
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / Math.max(rows, 1);

  const fs = cols === 4 ? 10 : 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW + 2;
    const cellTop = gridTop + row * rowH;
    const number = numberOffset + i + 1;
    const slotW = cols === 4 ? 16 : 60;
    const baselineY = cellTop + rowH / 2 + (fs * 0.352778) * 0.35;
    if (isCompareQuestion(q)) {
      drawCompareQuestion(doc, asCompare(q), cellX, baselineY, number, slotW);
    } else {
      drawShortQuestion(doc, q, cellX, baselineY, number, slotW);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

// Compose the answer key string for a single question. ASCII / WinAnsi only.
export function answerKeyText(q: DecimalsQuestion, num: number): string {
  if (isIdentifyQuestion(q)) {
    return `${num}) ${q.answerNum}/${q.answerDen}`;
  }
  if (isRoundQuestion(q)) {
    return `${num}) ${formatRoundAnswer(q)}`;
  }
  if (isCompareQuestion(q)) {
    return `${num}) ${q.answer.map(d => formatDecimal(d, decimalDp(d))).join(', ')}`;
  }
  if (isFractionDecimalQuestion(q)) {
    if (q.skill === 'fraction-to-decimal') {
      return `${num}) ${formatDecimal(q.decimal, decimalDp(q.decimal))}`;
    }
    return `${num}) ${fractionText(q.num, q.den)}`;
  }
  if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') return `${num}) ${fractionText(q.num, q.den)}`;
    if (q.skill === 'percent-decimal') {
      return `${num}) ${formatDecimal(q.decimal, decimalDp(q.decimal))}`;
    }
    return `${num}) ${q.percent}%`;
  }
  if (isAddSubQuestion(q)) {
    const dp = Math.max(decimalDp(q.a), decimalDp(q.b));
    return `${num}) ${formatDecimal(q.answer, dp)}`;
  }
  return `${num}) ?`;
}

// Round questions display their answer at the requested precision; preserve
// the trailing zero when the kid was asked to round to 1dp.
function formatRoundAnswer(q: RoundQuestion): string {
  if (q.precision === 0) return String(Math.round(q.answer));
  return formatDecimal(q.answer, q.precision);
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: DecimalsQuestion[][],
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

  const allQuestions: DecimalsQuestion[] = pages.flat();
  const total = allQuestions.length;

  // Compare answers take more width — drop to 3 cols when a compare appears
  // anywhere in the run; otherwise 5 cols.
  const hasCompare = allQuestions.some(q => q.skill === 'compare-decimals');
  const cols = hasCompare ? 3 : 5;
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

export function generateDecimalsPdf(opts: DecimalsPdfOptions): jsPDF {
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
