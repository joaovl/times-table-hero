import jsPDF from 'jspdf';
import type { ChartQuestion } from './logic';
import { axisMax, axisTickCount, buildPieSlices, isPieSkill } from './logic';

export interface ChartsPdfOptions {
  pages: ChartQuestion[][];
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

// Charts need horizontal space. 2-col grid keeps each chart legible even at
// 10 questions per page (5 rows).
const COLS = 2;

// Inner chart-area offsets within a cell (mm).
const CELL_PAD = 3;
const CHART_PAD_LEFT = 14;
const CHART_PAD_RIGHT = 4;
const CHART_PAD_TOP = 5;
const CHART_PAD_BOTTOM = 12;

function drawBarChart(
  doc: jsPDF,
  q: ChartQuestion,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Plot region.
  const plotX = x + CHART_PAD_LEFT;
  const plotY = y + CHART_PAD_TOP;
  const plotW = w - CHART_PAD_LEFT - CHART_PAD_RIGHT;
  const plotH = h - CHART_PAD_TOP - CHART_PAD_BOTTOM;

  const dataMax = q.categories.reduce((m, c) => Math.max(m, c.value), 0);
  const yMax = axisMax(dataMax);
  const ticks = axisTickCount(yMax);

  // Gridlines.
  doc.setDrawColor(200);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= ticks; i++) {
    const ty = plotY + plotH - (i / ticks) * plotH;
    doc.line(plotX, ty, plotX + plotW, ty);
  }

  // Axes (darker).
  doc.setDrawColor(40);
  doc.setLineWidth(0.4);
  doc.line(plotX, plotY, plotX, plotY + plotH); // y-axis
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // x-axis

  // Y-axis numeric labels.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40);
  for (let i = 0; i <= ticks; i++) {
    const v = Math.round((yMax * i) / ticks);
    const ty = plotY + plotH - (i / ticks) * plotH;
    doc.text(String(v), plotX - 1.2, ty + 0.8, { align: 'right' });
  }

  // Bars.
  const n = Math.max(1, q.categories.length);
  const slot = plotW / n;
  const barW = Math.max(2.5, slot * 0.65);
  doc.setDrawColor(40);
  doc.setLineWidth(0.25);
  doc.setFillColor(80, 120, 180);
  for (let i = 0; i < q.categories.length; i++) {
    const c = q.categories[i];
    const barH = (c.value / yMax) * plotH;
    const bx = plotX + i * slot + (slot - barW) / 2;
    const by = plotY + plotH - barH;
    doc.rect(bx, by, barW, barH, 'FD');

    // Value above each bar.
    doc.setFontSize(6.5);
    doc.setTextColor(40);
    doc.text(String(c.value), bx + barW / 2, by - 0.6, { align: 'center' });
  }

  // X-axis labels — keep small enough that a 7-category chart still fits.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(n >= 6 ? 6 : 7);
  doc.setTextColor(40);
  for (let i = 0; i < q.categories.length; i++) {
    const cx = plotX + i * slot + slot / 2;
    const ly = plotY + plotH + 3.2;
    doc.text(q.categories[i].label, cx, ly, { align: 'center' });
  }

  // Reset color.
  doc.setTextColor(0);
  doc.setDrawColor(0);
}

// Grey palette — printer-friendly, alternating shades so adjacent slices are
// distinguishable on a black-and-white printer. RGB triples; jsPDF interprets
// 3-arg setFillColor as RGB 0..255.
const PIE_SLICE_GREYS: Array<[number, number, number]> = [
  [210, 210, 210], // light grey
  [255, 255, 255], // white
  [180, 180, 180], // medium grey
  [235, 235, 235], // very light grey
];

// Number of straight segments used to approximate a circular arc over a full
// circle. ~32 segments around the circle reads as a clean pie at the cell
// sizes we use.
const ARC_SEGMENTS_FULL = 32;

/**
 * Draw a single pie sector as a closed polygon using doc.lines(). jsPDF has
 * no native arc primitive, so we approximate the arc with short line segments
 * and let jsPDF fill+stroke the polygon. The polygon's path is:
 *   center -> arc start -> ...arc samples... -> arc end -> (close back to center)
 *
 * Highlight gives the slice a thicker stroke — printer-safe (no extra glyphs).
 */
function drawPieSector(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  fill: [number, number, number],
  highlight: boolean,
) {
  const span = endAngle - startAngle;
  // Scale segments so smaller slices still get a few samples.
  const segs = Math.max(2, Math.ceil((span / (Math.PI * 2)) * ARC_SEGMENTS_FULL));

  // Build vectors as deltas in jsPDF's lines() convention. The starting point
  // is (cx, cy) — passed as x/y args. The first delta moves to the arc start.
  const lines: number[][] = [];
  const x0 = r * Math.cos(startAngle);
  const y0 = r * Math.sin(startAngle);
  let prevX = x0;
  let prevY = y0;
  lines.push([prevX, prevY]);
  for (let s = 1; s <= segs; s++) {
    const t = startAngle + (span * s) / segs;
    const ax = r * Math.cos(t);
    const ay = r * Math.sin(t);
    lines.push([ax - prevX, ay - prevY]);
    prevX = ax;
    prevY = ay;
  }
  // Final segment from arc end back to center is supplied by closed=true.

  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.setDrawColor(40);
  doc.setLineWidth(highlight ? 0.9 : 0.25);
  // jsPDF.lines(linesArr, x, y, scale, style, closed)
  doc.lines(lines, cx, cy, [1, 1], 'FD', true);
}

function drawPieChart(
  doc: jsPDF,
  q: ChartQuestion,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Reserve a bottom strip for the 2-column legend.
  const legendH = 14;
  const pieAreaH = h - legendH - 4;
  const pieAreaW = w;
  const cx = x + pieAreaW / 2;
  const cy = y + pieAreaH / 2 + 1;
  const r = Math.max(8, Math.min(pieAreaW, pieAreaH) / 2 - 2);

  const values = q.categories.map(c => c.value);
  const total = values.reduce((a, b) => a + b, 0);
  const slices = buildPieSlices(values, total);
  const highlightSet = new Set(q.skill === 'pie-fraction' ? q.targets : []);

  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    const fill = PIE_SLICE_GREYS[i % PIE_SLICE_GREYS.length];
    drawPieSector(doc, cx, cy, r, s.startAngle, s.endAngle, fill, highlightSet.has(i));
  }

  // Legend: two columns of swatch + label below the pie.
  const legendTop = y + pieAreaH + 2;
  const swatchW = 3;
  const swatchH = 3;
  const colW = w / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(40);
  for (let i = 0; i < q.categories.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = x + col * colW + 2;
    const ly = legendTop + row * (swatchH + 1.5);
    const fill = PIE_SLICE_GREYS[i % PIE_SLICE_GREYS.length];
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.setDrawColor(40);
    doc.setLineWidth(highlightSet.has(i) ? 0.6 : 0.2);
    doc.rect(lx, ly, swatchW, swatchH, 'FD');
    doc.text(q.categories[i].label, lx + swatchW + 1.2, ly + swatchH - 0.5);
  }

  doc.setTextColor(0);
  doc.setDrawColor(0);
}

function drawCell(
  doc: jsPDF,
  q: ChartQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number,
) {
  // Question number.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`${num}.`, cellX + 2, cellY + 5);

  // Chart area — leave room for prompt + answer line below.
  const promptH = 12; // mm of vertical space for the prompt + answer line
  const chartTop = cellY + 6;
  const chartH = cellH - promptH - 8;
  if (isPieSkill(q.skill)) {
    drawPieChart(doc, q, cellX + CELL_PAD, chartTop, cellW - CELL_PAD * 2, chartH);
  } else {
    drawBarChart(doc, q, cellX + CELL_PAD, chartTop, cellW - CELL_PAD * 2, chartH);
  }

  // Prompt text. Helvetica + ASCII labels so encoding stays clean.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const promptY = cellY + cellH - promptH + 4;
  const wrapped = doc.splitTextToSize(q.prompt, cellW - 6);
  doc.text(wrapped, cellX + 2, promptY);

  // Answer line.
  const lineY = cellY + cellH - 3;
  const lineX1 = cellX + 2;
  const lineX2 = cellX + Math.min(cellW - 2, 60);
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  studentName: string | undefined,
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0);
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
  questions: ChartQuestion[],
  title: string,
  subtitle: string,
  studentName?: string,
  numberOffset = 0,
) {
  drawHeader(doc, title, subtitle, studentName);

  const left = MARGIN;
  const top = MARGIN;

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

function answerKeyText(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) {
    return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  }
  return String(q.answer);
}

function drawAnswerKeyPage(
  doc: jsPDF,
  pages: ChartQuestion[][],
  title: string,
  studentName?: string,
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0);
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

  const allQuestions: ChartQuestion[] = pages.flat();
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
    doc.text(`${i + 1}) ${answerKeyText(q)}`, x, y);
  }
}

export function generateChartsPdf(opts: ChartsPdfOptions): jsPDF {
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
