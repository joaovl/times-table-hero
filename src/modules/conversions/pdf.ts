import jsPDF from 'jspdf';
import type {
  ConversionQuestion,
  FigureSpecL,
  FigureSpecRect,
  FigureSpecT,
} from './logic';
import { answerString, promptFor } from './logic';

export interface ConversionPdfOptions {
  pages: ConversionQuestion[][];
  title: string;
  subtitle: string;
  studentName?: string;
  includeAnswerKey?: boolean;
}

const A4_W = 210;
const A4_H = 297;
const MARGIN = 15;
const PRINT_W = A4_W - MARGIN * 2;
const PRINT_H = A4_H - MARGIN * 2;
const HEADER_H = 22;
const FOOTER_H = 12;

/** Skills that need a figure — they render at 2 cols so each cell is big. */
const FIGURE_SKILLS = new Set<ConversionQuestion['skill']>([
  'perimeter-composite',
  'area-irregular',
  'volume-cube',
  'volume-cuboid',
]);

/**
 * Whether a question is "figure-heavy" — if the page's questions are
 * predominantly figure-based we switch to a 2-column layout. Otherwise we
 * use 4 columns for compact text-only conversion lines.
 */
function pageColumnCount(qs: ConversionQuestion[]): number {
  const figureCount = qs.filter(q => FIGURE_SKILLS.has(q.skill)).length;
  return figureCount * 2 >= qs.length ? 2 : 4;
}

// ---------------------------------------------------------------------------
// Per-skill cell renderers
// ---------------------------------------------------------------------------

function drawSimpleConversionCell(
  doc: jsPDF,
  q: ConversionQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 6);

  const prompt = promptFor(q);
  doc.setFontSize(12);
  // Centre the prompt vertically within the cell, leaving room for an
  // answer line below. For 4-col text-only cells we keep it on one line.
  const promptY = cellY + cellH / 2 - 1;
  doc.text(prompt, cellX + 6, promptY);

  // Answer line beneath the prompt.
  const lineY = cellY + cellH - 4;
  doc.setLineWidth(0.3);
  doc.line(cellX + 4, lineY, cellX + cellW - 4, lineY);
}

function drawCompositePerimeterCell(
  doc: jsPDF,
  q: Extract<ConversionQuestion, { skill: 'perimeter-composite' }>,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 6);

  // Figure box — leave room at the bottom for prompt + answer line.
  const promptH = 6;
  const answerH = 7;
  const figTop = cellY + 8;
  const figBoxH = cellH - promptH - answerH - 8;
  const figBoxW = cellW - 12;
  const figCX = cellX + cellW / 2;
  const figCY = figTop + figBoxH / 2;

  if (q.layout === 'rect') {
    const spec = q.figureSpec as FigureSpecRect;
    const maxDim = Math.max(spec.w, spec.h);
    const scale = Math.min(figBoxW / maxDim, figBoxH / maxDim) * 0.7;
    const w = spec.w * scale;
    const h = spec.h * scale;
    const x0 = figCX - w / 2;
    const y0 = figCY - h / 2;
    doc.setLineWidth(0.4);
    doc.setDrawColor(0);
    doc.rect(x0, y0, w, h);
    doc.setFontSize(8);
    doc.text(`${spec.w} ${q.unit}`, figCX, y0 - 1, { align: 'center' });
    doc.text(`${spec.h} ${q.unit}`, x0 + w + 1, figCY, { baseline: 'middle' });
  } else if (q.layout === 'L') {
    const spec = q.figureSpec as FigureSpecL;
    const maxDim = Math.max(spec.outerW, spec.outerH);
    const scale = Math.min(figBoxW / maxDim, figBoxH / maxDim) * 0.7;
    const W = spec.outerW * scale;
    const H = spec.outerH * scale;
    const cW = spec.cutW * scale;
    const cH = spec.cutH * scale;
    const x0 = figCX - W / 2;
    const y0 = figCY - H / 2;
    // Walk the L polygon as 6 line segments.
    const pts = [
      { x: x0, y: y0 },
      { x: x0 + W, y: y0 },
      { x: x0 + W, y: y0 + H - cH },
      { x: x0 + W - cW, y: y0 + H - cH },
      { x: x0 + W - cW, y: y0 + H },
      { x: x0, y: y0 + H },
    ];
    doc.setLineWidth(0.4);
    doc.setDrawColor(0);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      doc.line(a.x, a.y, b.x, b.y);
    }
    // Edge labels.
    doc.setFontSize(7);
    doc.text(`${spec.outerW} ${q.unit}`, figCX, y0 - 1, { align: 'center' });
    doc.text(`${spec.outerH - spec.cutH} ${q.unit}`, x0 + W + 1, y0 + (H - cH) / 2, { baseline: 'middle' });
    doc.text(`${spec.cutW} ${q.unit}`, x0 + W - cW / 2, y0 + H - cH - 0.5, { align: 'center' });
    doc.text(`${spec.cutH} ${q.unit}`, x0 + W - cW + 1, y0 + H - cH / 2, { baseline: 'middle' });
    doc.text(`${spec.outerW - spec.cutW} ${q.unit}`, x0 + (W - cW) / 2, y0 + H + 3, { align: 'center' });
    doc.text(`${spec.outerH} ${q.unit}`, x0 - 1, y0 + H / 2, { align: 'right', baseline: 'middle' });
  } else {
    // T-shape
    const spec = q.figureSpec as FigureSpecT;
    const totalW = spec.topW;
    const totalH = spec.topH + spec.stemH;
    const maxDim = Math.max(totalW, totalH);
    const scale = Math.min(figBoxW / maxDim, figBoxH / maxDim) * 0.7;
    const tW = spec.topW * scale;
    const tH = spec.topH * scale;
    const sW = spec.stemW * scale;
    const sH = spec.stemH * scale;
    const x0 = figCX - tW / 2;
    const y0 = figCY - (tH + sH) / 2;
    const shoulderPx = (tW - sW) / 2;
    const pts = [
      { x: x0, y: y0 },
      { x: x0 + tW, y: y0 },
      { x: x0 + tW, y: y0 + tH },
      { x: x0 + tW - shoulderPx, y: y0 + tH },
      { x: x0 + tW - shoulderPx, y: y0 + tH + sH },
      { x: x0 + shoulderPx, y: y0 + tH + sH },
      { x: x0 + shoulderPx, y: y0 + tH },
      { x: x0, y: y0 + tH },
    ];
    doc.setLineWidth(0.4);
    doc.setDrawColor(0);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      doc.line(a.x, a.y, b.x, b.y);
    }
    doc.setFontSize(7);
    doc.text(`${spec.topW} ${q.unit}`, figCX, y0 - 1, { align: 'center' });
    doc.text(`${spec.topH} ${q.unit}`, x0 + tW + 1, y0 + tH / 2, { baseline: 'middle' });
    doc.text(`${spec.stemH} ${q.unit}`, x0 + tW - shoulderPx + 1, y0 + tH + sH / 2, { baseline: 'middle' });
    doc.text(`${spec.stemW} ${q.unit}`, figCX, y0 + tH + sH + 3, { align: 'center' });
  }

  // Prompt + answer line.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const prompt = promptFor(q);
  const promptY = cellY + cellH - answerH - 2;
  doc.text(prompt, cellX + 4, promptY);
  const lineY = cellY + cellH - 3;
  const lineX1 = cellX + 4 + doc.getTextWidth(prompt) + 2;
  const lineX2 = cellX + cellW - 4;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawAreaIrregularCell(
  doc: jsPDF,
  q: Extract<ConversionQuestion, { skill: 'area-irregular' }>,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 6);

  const answerH = 7;
  const figTop = cellY + 8;
  const figBoxH = cellH - answerH - 12;
  const figBoxW = cellW - 12;

  const rows = q.grid.length;
  const cols = q.grid[0]?.length ?? 1;
  const cellSize = Math.min(figBoxW / cols, figBoxH / rows);
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  const x0 = cellX + cellW / 2 - gridW / 2;
  const y0 = figTop + (figBoxH - gridH) / 2;

  doc.setLineWidth(0.3);
  doc.setDrawColor(0);
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const shaded = q.grid[ry][cx];
      if (shaded) {
        // Three-number form per jsPDF v3 types: (r, g, b).
        doc.setFillColor(180, 180, 180);
        doc.rect(x0 + cx * cellSize, y0 + ry * cellSize, cellSize, cellSize, 'FD');
      } else {
        doc.rect(x0 + cx * cellSize, y0 + ry * cellSize, cellSize, cellSize);
      }
    }
  }

  // Prompt + answer line.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const prompt = promptFor(q);
  const promptY = cellY + cellH - answerH - 2;
  doc.text(prompt, cellX + 4, promptY);
  const lineY = cellY + cellH - 3;
  const lineX1 = cellX + 4 + doc.getTextWidth(prompt) + 2;
  const lineX2 = cellX + cellW - 4;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawCuboidCell(
  doc: jsPDF,
  q: Extract<ConversionQuestion, { skill: 'volume-cube' | 'volume-cuboid' }>,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${num}.`, cellX + 2, cellY + 6);

  const answerH = 7;
  const figTop = cellY + 8;
  const figBoxH = cellH - answerH - 12;
  const figBoxW = cellW - 12;
  const figCX = cellX + cellW / 2;
  const figCY = figTop + figBoxH / 2;

  const L = q.skill === 'volume-cube' ? q.side : q.length;
  const W = q.skill === 'volume-cube' ? q.side : q.width;
  const H = q.skill === 'volume-cube' ? q.side : q.height;

  // Fixed visual proportions, scaled to fit cell.
  const baseFrontW = 36;
  const baseFrontH = 26;
  const depthDx = 11;
  const depthDy = -8;
  const scale = Math.min(figBoxW / (baseFrontW + depthDx + 6), figBoxH / (baseFrontH + Math.abs(depthDy) + 6));
  const fw = baseFrontW * scale;
  const fh = baseFrontH * scale;
  const dx = depthDx * scale;
  const dy = depthDy * scale;

  const fx = figCX - (fw + dx) / 2;
  const fy = figCY + (Math.abs(dy) - fh) / 2 - dy / 2; // centre the bounding box

  const FTL = { x: fx, y: fy };
  const FTR = { x: fx + fw, y: fy };
  const FBR = { x: fx + fw, y: fy + fh };
  const FBL = { x: fx, y: fy + fh };
  const BTL = { x: FTL.x + dx, y: FTL.y + dy };
  const BTR = { x: FTR.x + dx, y: FTR.y + dy };
  const BBR = { x: FBR.x + dx, y: FBR.y + dy };

  doc.setLineWidth(0.4);
  doc.setDrawColor(0);
  // Front face
  doc.line(FTL.x, FTL.y, FTR.x, FTR.y);
  doc.line(FTR.x, FTR.y, FBR.x, FBR.y);
  doc.line(FBR.x, FBR.y, FBL.x, FBL.y);
  doc.line(FBL.x, FBL.y, FTL.x, FTL.y);
  // Top face
  doc.line(FTL.x, FTL.y, BTL.x, BTL.y);
  doc.line(BTL.x, BTL.y, BTR.x, BTR.y);
  doc.line(BTR.x, BTR.y, FTR.x, FTR.y);
  // Right face
  doc.line(FTR.x, FTR.y, BTR.x, BTR.y);
  doc.line(BTR.x, BTR.y, BBR.x, BBR.y);
  doc.line(BBR.x, BBR.y, FBR.x, FBR.y);

  // Small edge labels.
  doc.setFontSize(7);
  // Length along bottom front
  doc.text(`${L} cm`, (FBL.x + FBR.x) / 2, FBR.y + 3, { align: 'center' });
  // Height along left front
  doc.text(`${H} cm`, FTL.x - 1, (FTL.y + FBL.y) / 2, { align: 'right', baseline: 'middle' });
  // Width along top-right depth
  doc.text(`${W} cm`, (FTR.x + BTR.x) / 2 + 2, (FTR.y + BTR.y) / 2 - 0.5);

  // Prompt + answer line.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const prompt = q.skill === 'volume-cube' ? 'Volume?' : 'Volume?';
  const promptY = cellY + cellH - answerH - 2;
  doc.text(prompt, cellX + 4, promptY);
  const lineY = cellY + cellH - 3;
  const lineX1 = cellX + 4 + doc.getTextWidth(prompt) + 2;
  const lineX2 = cellX + cellW - 4;
  doc.setLineWidth(0.3);
  doc.line(lineX1, lineY, lineX2, lineY);
}

function drawCell(
  doc: jsPDF,
  q: ConversionQuestion,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  num: number
) {
  if (q.skill === 'perimeter-composite') {
    drawCompositePerimeterCell(doc, q, cellX, cellY, cellW, cellH, num);
  } else if (q.skill === 'area-irregular') {
    drawAreaIrregularCell(doc, q, cellX, cellY, cellW, cellH, num);
  } else if (q.skill === 'volume-cube' || q.skill === 'volume-cuboid') {
    drawCuboidCell(doc, q, cellX, cellY, cellW, cellH, num);
  } else {
    drawSimpleConversionCell(doc, q, cellX, cellY, cellW, cellH, num);
  }
}

// ---------------------------------------------------------------------------
// Page chrome + answer key
// ---------------------------------------------------------------------------

function drawPage(
  doc: jsPDF,
  questions: ConversionQuestion[],
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

  const cols = pageColumnCount(questions);
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
  pages: ConversionQuestion[][],
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

  const allQuestions: ConversionQuestion[] = pages.flat();
  const total = allQuestions.length;

  const cols = 4;
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
    const y = gridTop + row * rowH + rowH / 2 + (fs * 0.352778) * 0.35;
    doc.text(`${i + 1}) ${answerString(q)}`, x, y);
  }
}

export function generateConversionsPdf(opts: ConversionPdfOptions): jsPDF {
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
