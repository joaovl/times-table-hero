import jsPDF from 'jspdf';
import type { ShapeKind, ShapeQuestion } from './logic';
import { answerString, promptFor } from './logic';

export interface ShapePdfOptions {
  pages: ShapeQuestion[][];
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

// 3-column grid: shapes need horizontal space for labels.
const COLS = 3;

/**
 * Compute the n vertices of a regular polygon inscribed in a circle of
 * `radius` centred at (cx, cy). Rotation puts the first vertex straight up.
 * Mirrors the SVG ShapeFigure math so screen and print agree.
 */
function regularPolygonVertices(
  n: number,
  cx: number,
  cy: number,
  radius: number
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return pts;
}

function drawPolygon(
  doc: jsPDF,
  vertices: Array<{ x: number; y: number }>
) {
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    doc.line(a.x, a.y, b.x, b.y);
  }
}

function drawNamedShape(
  doc: jsPDF,
  shape: ShapeKind,
  cx: number,
  cy: number,
  radius: number
) {
  if (shape === 'circle') {
    doc.setLineWidth(0.5);
    doc.setDrawColor(0);
    doc.circle(cx, cy, radius);
    return;
  }
  if (shape === 'square') {
    const s = radius * 1.4;
    const x0 = cx - s / 2;
    const y0 = cy - s / 2;
    drawPolygon(doc, [
      { x: x0, y: y0 },
      { x: x0 + s, y: y0 },
      { x: x0 + s, y: y0 + s },
      { x: x0, y: y0 + s },
    ]);
    return;
  }
  if (shape === 'rectangle') {
    const w = radius * 1.75;
    const h = radius * 1.0;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    drawPolygon(doc, [
      { x: x0, y: y0 },
      { x: x0 + w, y: y0 },
      { x: x0 + w, y: y0 + h },
      { x: x0, y: y0 + h },
    ]);
    return;
  }
  let n = 3;
  if (shape === 'pentagon') n = 5;
  else if (shape === 'hexagon') n = 6;
  else if (shape === 'octagon') n = 8;
  // triangle: n = 3 (default)
  drawPolygon(doc, regularPolygonVertices(n, cx, cy, radius));
}

function drawDimensionedRect(
  doc: jsPDF,
  q: ShapeQuestion,
  cx: number,
  cy: number,
  boxW: number
) {
  // Visual rectangle: fixed aspect ratio (the labels carry the real numbers).
  const w = boxW;
  const h = w * 0.55;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  drawPolygon(doc, [
    { x: x0, y: y0 },
    { x: x0 + w, y: y0 },
    { x: x0 + w, y: y0 + h },
    { x: x0, y: y0 + h },
  ]);

  // Top label (width).
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const widthLabel = `${q.width ?? 0} ${q.units}`;
  doc.text(widthLabel, cx, y0 - 1.5, { align: 'center' });

  // Right label (height).
  const heightLabel = `${q.height ?? 0} ${q.units}`;
  doc.text(heightLabel, x0 + w + 1.5, cy, { baseline: 'middle' });
}

function drawCell(
  doc: jsPDF,
  q: ShapeQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  // Question number prefix.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 5);

  // Figure region: most of the cell, leaving room for prompt + answer line.
  const promptH = 6;
  const answerH = 7;
  const figTop = cellY + 6; // below number
  const figBoxH = cellH - promptH - answerH - 8;
  const figBoxW = cellW - 8;
  const cx = cellX + cellW / 2;
  const cy = figTop + figBoxH / 2;
  const radius = Math.max(6, Math.min(figBoxH, figBoxW) / 2 - 2);

  if (q.skill === 'perimeter-rect' || q.skill === 'area-rect') {
    const drawW = Math.min(figBoxW - 6, radius * 1.75);
    drawDimensionedRect(doc, q, cx, cy, drawW);
  } else if (q.shape) {
    drawNamedShape(doc, q.shape, cx, cy, radius);
  }

  // Prompt + answer line at the bottom of the cell.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const prompt = promptFor(q);
  const promptY = cellY + cellH - answerH - 2;
  doc.text(prompt, cellX + 3, promptY);

  // Answer line.
  const lineY = cellY + cellH - 3;
  const lineX1 = cellX + 3 + doc.getTextWidth(prompt) + 2;
  const lineX2 = cellX + cellW - 3;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawPage(
  doc: jsPDF,
  questions: ShapeQuestion[],
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
  pages: ShapeQuestion[][],
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

  const allQuestions: ShapeQuestion[] = pages.flat();
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
    doc.text(`${i + 1}) ${answerString(q)}`, x, y);
  }
}

export function generateShapesPdf(opts: ShapePdfOptions): jsPDF {
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
