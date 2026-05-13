// Small shared kit of SVG-like primitive helpers for the jsPDF documents
// the print-resources path emits. Each module's `pdf.ts` had a private
// copy of these — this file is the single home so future tweaks (e.g. a
// fill-colour change or a higher arc fidelity) only need to be made once.
//
// Why a separate helper file (not inside any one module's pdf.ts):
//   jsPDF has no native arc / sector / polygon — only line, circle, rect,
//   triangle, and the polyline `lines()` primitive. Every module that
//   wants a pie slice, an angle-arc, or a triangle/quadrilateral re-rolls
//   the same trig. That duplication has caused real drift: an arc
//   fidelity bump in shapes was never copied to charts.
//
// Each helper takes the jsPDF doc as its first argument so we don't
// retain any module state and the helpers are trivial to mock from
// tests (see `svgPdf.test.ts`).
//
// TODO future PRs: migrate the remaining duplicates.
//   - charts/pdf.ts drawPieSector — uses doc.lines() polyline approach;
//     can become `drawFilledSector` once the fill+stroke shape matches.
//   - shapes/pdf.ts angle-arc renderers (around line 198 and line 476)
//     can call `drawArcPolyline` directly.
//   - shapes/pdf.ts triangle base/right-triangle fill (around line 290)
//     can call `drawPolygon` with style='FD'.
//   - conversions/pdf.ts cuboid faces can call `drawPolygon`.

import type jsPDF from 'jspdf';

export type RgbTuple = [number, number, number];

/**
 * Draw a filled circle sector centred at (cx, cy) spanning [startRad, endRad].
 *
 * The sector is rendered as `segments` triangles from the centre to chord
 * endpoints along the arc. With segments=1 (the default) the sector is a
 * single triangle — visually OK for small fractions (≤ 1/4 of a circle).
 * Higher segment counts produce a smoother edge for large arcs.
 *
 * No stroke is applied; callers that want a boundary draw the chord lines
 * separately (matches the existing fractions/pdf.ts behaviour).
 */
export function drawFilledSector(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  fillColour: RgbTuple,
  segments = 1,
): void {
  const segs = Math.max(1, Math.floor(segments));
  doc.setFillColor(fillColour[0], fillColour[1], fillColour[2]);
  const span = endRad - startRad;
  let a0 = startRad;
  let x0 = cx + r * Math.cos(a0);
  let y0 = cy + r * Math.sin(a0);
  for (let i = 1; i <= segs; i++) {
    const a1 = startRad + (span * i) / segs;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    doc.triangle(cx, cy, x0, y0, x1, y1, 'F');
    a0 = a1;
    x0 = x1;
    y0 = y1;
  }
}

/**
 * Draw an arc as a polyline of `segments` short line segments between
 * (cx + r·cos(startRad), cy + r·sin(startRad)) and the endpoint at endRad.
 *
 * The current draw colour / line width are honoured — callers should set
 * those before calling. We do NOT mutate fill state.
 *
 * The y-axis matches SVG convention (positive y goes DOWN on the page),
 * so an angle arc drawn from 0 to π/2 sweeps from "east" to "south" on
 * the printed page. Modules that want a "north" sweep (e.g. shapes'
 * angle markers) pass negated y deltas at the call site — see
 * shapes/pdf.ts around line 207 for the pattern.
 */
export function drawArcPolyline(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  segments = 16,
): void {
  const segs = Math.max(1, Math.floor(segments));
  const span = endRad - startRad;
  let prevX = cx + r * Math.cos(startRad);
  let prevY = cy + r * Math.sin(startRad);
  for (let i = 1; i <= segs; i++) {
    const t = startRad + (span * i) / segs;
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
}

/**
 * Draw a closed polygon through the given points using jsPDF's `lines()`
 * primitive.
 *
 * `style`:
 *   - 'S'  stroke only (default)
 *   - 'F'  fill only
 *   - 'FD' fill and stroke
 *
 * Behaviour matches the existing inline implementations: the polygon is
 * closed automatically (the path returns to the first point), so callers
 * pass each vertex exactly once.
 */
export function drawPolygon(
  doc: jsPDF,
  points: Array<[number, number]>,
  style: 'F' | 'S' | 'FD' = 'S',
): void {
  if (points.length < 2) return;
  const [x0, y0] = points[0];
  // jsPDF's `lines()` takes deltas, not absolute coords, and starts at
  // (x, y). Build a delta list from the absolute point list.
  const deltas: number[][] = [];
  let prevX = x0;
  let prevY = y0;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    deltas.push([x - prevX, y - prevY]);
    prevX = x;
    prevY = y;
  }
  // scale = [1, 1], style as passed, closed = true.
  // The empty deltas case (single-point polygon) is guarded above.
  doc.lines(deltas, x0, y0, [1, 1], style, true);
}
