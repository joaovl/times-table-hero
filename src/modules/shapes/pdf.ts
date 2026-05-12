import jsPDF from 'jspdf';
import type { ShapeKind, ShapeQuestion, SolidKind } from './logic';
import { answerString, promptFor } from './logic';

/** Format a numeric value for in-figure labels — drops trailing zeros so
 *  a whole number reads as "5" rather than "5.00". Mirrors logic.ts's
 *  internal helper but kept local so pdf.ts has no extra imports. */
function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, '');
}

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

function drawRightTriangle(
  doc: jsPDF,
  q: ShapeQuestion,
  cx: number,
  cy: number,
  boxW: number
) {
  // Right triangle: right angle at the bottom-left corner. The drawn
  // figure has a fixed visual aspect — the labels carry the actual
  // numeric base and height.
  const w = boxW;
  const h = w * 0.62;
  const x0 = cx - w / 2;
  const yB = cy + h / 2;
  const xR = x0 + w;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.line(x0, yB - h, x0, yB);
  doc.line(x0, yB, xR, yB);
  doc.line(x0, yB - h, xR, yB);
  // Small right-angle marker at the bottom-left corner.
  const m = Math.min(2.5, w * 0.06);
  doc.line(x0 + m, yB, x0 + m, yB - m);
  doc.line(x0, yB - m, x0 + m, yB - m);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  // Base label below the bottom edge.
  doc.text(`base = ${fmt(q.width ?? 0)} ${q.units}`, cx, yB + 4, { align: 'center' });
  // Height label to the left of the vertical side.
  doc.text(`h = ${fmt(q.height ?? 0)} ${q.units}`, x0 - 1.5, yB - h / 2, {
    align: 'right',
    baseline: 'middle',
  });
}

function drawCircleWithRadius(
  doc: jsPDF,
  q: ShapeQuestion,
  cx: number,
  cy: number,
  drawR: number
) {
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.circle(cx, cy, drawR);
  // Radius line from centre to the rightmost edge.
  doc.line(cx, cy, cx + drawR, cy);
  // Small dot at the centre.
  doc.setFillColor(0, 0, 0);
  doc.circle(cx, cy, 0.5, 'F');
  // Label above the radius line.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`r = ${fmt(q.radius ?? 0)} ${q.units}`, cx + drawR / 2, cy - 1, {
    align: 'center',
  });
}

function drawAngleFigure(
  doc: jsPDF,
  q: ShapeQuestion,
  cx: number,
  cy: number,
  armLen: number
) {
  // Two rays from a common vertex. The vertex sits a bit down-and-left of
  // the cell centre so the rotated ray has room to swing upward without
  // running into the cell border. We don't label the numeric angle — the
  // kid identifies acute/right/obtuse from the figure.
  const angleDeg = q.angle ?? 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const vx = cx - armLen * 0.25;
  const vy = cy + armLen * 0.25;
  const r1x = vx + armLen;
  const r1y = vy;
  // PDF y grows downward; subtract the sin term to rotate CCW visually.
  const r2x = vx + armLen * Math.cos(angleRad);
  const r2y = vy - armLen * Math.sin(angleRad);
  doc.setLineWidth(0.6);
  doc.setDrawColor(0);
  doc.line(vx, vy, r1x, r1y);
  doc.line(vx, vy, r2x, r2y);
  // Approximate the arc as a short polyline (8 segments) — keeps the
  // primitives count small and the visual unambiguous.
  const arcR = armLen * 0.28;
  const segs = 8;
  let prevX = vx + arcR;
  let prevY = vy;
  doc.setLineWidth(0.4);
  for (let i = 1; i <= segs; i++) {
    const t = (i / segs) * angleRad;
    const x = vx + arcR * Math.cos(t);
    const y = vy - arcR * Math.sin(t);
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
  // Tiny vertex dot.
  doc.setFillColor(0, 0, 0);
  doc.circle(vx, vy, 0.5, 'F');
}

/**
 * Draw an iso-projection of a 3D solid. Mirrors ShapeFigure's SolidFigure
 * helper but uses jsPDF primitives. Hidden edges use a dashed pattern
 * (jsPDF's setLineDashPattern).
 */
function drawSolid(
  doc: jsPDF,
  solid: SolidKind,
  cx: number,
  cy: number,
  size: number
) {
  doc.setDrawColor(0);
  // Use size as overall scale — most figures fit in a square of `size` mm.
  const dxIso = (size * 0.35) * Math.cos(Math.PI / 6);
  const dyIso = -(size * 0.35) * Math.sin(Math.PI / 6);

  const setSolid = () => {
    doc.setLineWidth(0.5);
    if (typeof (doc as unknown as { setLineDashPattern?: (p: number[], o: number) => void }).setLineDashPattern === 'function') {
      (doc as unknown as { setLineDashPattern: (p: number[], o: number) => void }).setLineDashPattern([], 0);
    }
  };
  const setDashed = () => {
    doc.setLineWidth(0.3);
    if (typeof (doc as unknown as { setLineDashPattern?: (p: number[], o: number) => void }).setLineDashPattern === 'function') {
      (doc as unknown as { setLineDashPattern: (p: number[], o: number) => void }).setLineDashPattern([0.8, 0.8], 0);
    }
  };

  if (solid === 'cube' || solid === 'cuboid') {
    const w = solid === 'cube' ? size * 0.55 : size * 0.7;
    const h = solid === 'cube' ? size * 0.55 : size * 0.4;
    const x0 = cx - w / 2 - dxIso / 2;
    const y0 = cy - h / 2 - dyIso / 2;
    const a = { x: x0, y: y0 + h };
    const b = { x: x0 + w, y: y0 + h };
    const c = { x: x0 + w, y: y0 };
    const d = { x: x0, y: y0 };
    const ap = { x: a.x + dxIso, y: a.y + dyIso };
    const bp = { x: b.x + dxIso, y: b.y + dyIso };
    const cp = { x: c.x + dxIso, y: c.y + dyIso };
    const dp = { x: d.x + dxIso, y: d.y + dyIso };
    setSolid();
    const visible: Array<[typeof a, typeof a]> = [
      [a, b], [b, c], [c, d], [d, a],
      [d, dp], [c, cp], [b, bp],
      [dp, cp], [cp, bp],
    ];
    visible.forEach(([p, q]) => doc.line(p.x, p.y, q.x, q.y));
    setDashed();
    const hidden: Array<[typeof a, typeof a]> = [
      [a, ap], [ap, dp], [ap, bp],
    ];
    hidden.forEach(([p, q]) => doc.line(p.x, p.y, q.x, q.y));
    setSolid();
    return;
  }

  if (solid === 'cylinder') {
    const rx = size * 0.34;
    const ry = size * 0.10;
    const halfH = size * 0.34;
    setSolid();
    // Top ellipse — approximated as an axis-aligned ellipse via jsPDF's
    // ellipse() helper.
    if (typeof (doc as unknown as { ellipse?: (x: number, y: number, rx: number, ry: number) => void }).ellipse === 'function') {
      (doc as unknown as { ellipse: (x: number, y: number, rx: number, ry: number) => void }).ellipse(cx, cy - halfH, rx, ry);
    }
    // Sides.
    doc.line(cx - rx, cy - halfH, cx - rx, cy + halfH);
    doc.line(cx + rx, cy - halfH, cx + rx, cy + halfH);
    // Visible front half of base: approximate the lower half-arc as a
    // short polyline.
    const segs = 10;
    let prevX = cx - rx;
    let prevY = cy + halfH;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = cy + halfH + ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    // Hidden back half of base.
    setDashed();
    prevX = cx - rx;
    prevY = cy + halfH;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = cy + halfH - ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    setSolid();
    return;
  }

  if (solid === 'sphere') {
    setSolid();
    doc.circle(cx, cy, size * 0.38);
    // Equator hint: front half solid, back half dashed.
    const rx = size * 0.38;
    const ry = size * 0.12;
    let prevX = cx - rx;
    let prevY = cy;
    const segs = 10;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = cy + ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    setDashed();
    prevX = cx - rx;
    prevY = cy;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = cy - ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    setSolid();
    return;
  }

  if (solid === 'cone') {
    setSolid();
    const apexY = cy - size * 0.4;
    const baseY = cy + size * 0.28;
    const rx = size * 0.34;
    const ry = size * 0.09;
    doc.line(cx, apexY, cx - rx, baseY);
    doc.line(cx, apexY, cx + rx, baseY);
    // Front half of base.
    const segs = 10;
    let prevX = cx - rx;
    let prevY = baseY;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = baseY + ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    // Hidden back half of base.
    setDashed();
    prevX = cx - rx;
    prevY = baseY;
    for (let i = 1; i <= segs; i++) {
      const t = (i / segs) * Math.PI;
      const x = cx - rx * Math.cos(t);
      const y = baseY - ry * Math.sin(t);
      doc.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
    setSolid();
    return;
  }

  // pyramid (square base).
  setSolid();
  const apex = { x: cx + dxIso / 2, y: cy - size * 0.38 };
  const w = size * 0.55;
  const fl = { x: cx - w / 2, y: cy + size * 0.28 };
  const fr = { x: cx + w / 2, y: cy + size * 0.28 };
  const br = { x: fr.x + dxIso, y: fr.y + dyIso };
  const bl = { x: fl.x + dxIso, y: fl.y + dyIso };
  doc.line(apex.x, apex.y, fl.x, fl.y);
  doc.line(apex.x, apex.y, fr.x, fr.y);
  doc.line(apex.x, apex.y, br.x, br.y);
  doc.line(fl.x, fl.y, fr.x, fr.y);
  doc.line(fr.x, fr.y, br.x, br.y);
  setDashed();
  doc.line(apex.x, apex.y, bl.x, bl.y);
  doc.line(fl.x, fl.y, bl.x, bl.y);
  doc.line(bl.x, bl.y, br.x, br.y);
  setSolid();
}

/**
 * Draw an empty (no marker) first-quadrant coordinate grid. `marker` is
 * an optional point drawn as a filled dot — used for coord-read.
 */
function drawCoordGrid(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  gridMax: number,
  marker: { x: number; y: number } | null
) {
  const usable = size * 0.86;
  const step = usable / gridMax;
  const x0 = cx - usable / 2;
  const y0 = cy + usable / 2;
  doc.setDrawColor(150);
  doc.setLineWidth(0.15);
  for (let i = 0; i <= gridMax; i++) {
    // vertical grid line
    doc.line(x0 + i * step, y0, x0 + i * step, y0 - usable);
    // horizontal grid line
    doc.line(x0, y0 - i * step, x0 + usable, y0 - i * step);
  }
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(x0, y0, x0 + usable, y0); // x axis
  doc.line(x0, y0, x0, y0 - usable); // y axis

  // Tick labels.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const tickStep = gridMax <= 10 ? 1 : 2;
  for (let t = 0; t <= gridMax; t += tickStep) {
    doc.text(String(t), x0 + t * step, y0 + 2.2, { align: 'center' });
    doc.text(String(t), x0 - 1, y0 - t * step + 0.6, { align: 'right' });
  }

  if (marker) {
    doc.setFillColor(0, 0, 0);
    doc.circle(x0 + marker.x * step, y0 - marker.y * step, 0.7, 'F');
  }
}

/**
 * Draw a "?°" labelled angle figure. The arc is shown so the kid can
 * read off the value with a (mental) protractor. The label only renders
 * for angle-measure, not angle-name-reflex.
 */
function drawAngleFigureWithLabel(
  doc: jsPDF,
  q: ShapeQuestion,
  cx: number,
  cy: number,
  armLen: number
) {
  const angleDeg = q.angle ?? 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const vx = cx - armLen * 0.15;
  const vy = cy + armLen * 0.2;
  const r1x = vx + armLen;
  const r1y = vy;
  const r2x = vx + armLen * Math.cos(angleRad);
  const r2y = vy - armLen * Math.sin(angleRad);
  doc.setLineWidth(0.6);
  doc.setDrawColor(0);
  doc.line(vx, vy, r1x, r1y);
  doc.line(vx, vy, r2x, r2y);
  // Arc as a short polyline.
  const arcR = armLen * 0.32;
  const segs = Math.max(8, Math.round((angleDeg / 360) * 32));
  let prevX = vx + arcR;
  let prevY = vy;
  doc.setLineWidth(0.4);
  for (let i = 1; i <= segs; i++) {
    const t = (i / segs) * angleRad;
    const x = vx + arcR * Math.cos(t);
    const y = vy - arcR * Math.sin(t);
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
  doc.setFillColor(0, 0, 0);
  doc.circle(vx, vy, 0.5, 'F');
  if (q.skill === 'angle-measure') {
    const midRad = angleRad / 2;
    const labelR = arcR + 3.5;
    const lx = vx + labelR * Math.cos(midRad);
    const ly = vy - labelR * Math.sin(midRad);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('?°', lx, ly, { align: 'center', baseline: 'middle' });
  }
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
  } else if (q.skill === 'area-tri') {
    const drawW = Math.min(figBoxW - 6, radius * 1.6);
    drawRightTriangle(doc, q, cx, cy, drawW);
  } else if (q.skill === 'area-circle' || q.skill === 'circumference') {
    const drawR = Math.max(6, Math.min(radius, figBoxW / 2 - 8));
    drawCircleWithRadius(doc, q, cx, cy, drawR);
  } else if (q.skill === 'angle-name') {
    const armLen = Math.min(radius * 1.4, figBoxW / 2 - 2);
    drawAngleFigure(doc, q, cx, cy, armLen);
  } else if (q.skill === 'angle-measure' || q.skill === 'angle-name-reflex') {
    const armLen = Math.min(radius * 1.4, figBoxW / 2 - 2);
    drawAngleFigureWithLabel(doc, q, cx, cy, armLen);
  } else if (
    q.skill === 'name-3d' ||
    q.skill === 'count-faces' ||
    q.skill === 'count-edges' ||
    q.skill === 'count-vertices'
  ) {
    drawSolid(doc, q.solid ?? 'cube', cx, cy, Math.min(figBoxW, figBoxH) - 2);
  } else if (q.skill === 'lines-of-symmetry' && q.shape) {
    drawNamedShape(doc, q.shape, cx, cy, radius);
  } else if (q.skill === 'coord-read') {
    drawCoordGrid(doc, cx, cy, Math.min(figBoxW, figBoxH), q.gridMax ?? 5, q.point ?? null);
  } else if (q.skill === 'coord-plot' || q.skill === 'translation') {
    // Empty grid — kid plots / writes coords on the printed grid.
    drawCoordGrid(doc, cx, cy, Math.min(figBoxW, figBoxH), q.gridMax ?? 5, null);
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
