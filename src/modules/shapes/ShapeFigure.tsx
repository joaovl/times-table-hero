// Regular polygon vertices computed via standard trig (i*2π/n around the
// center). SVG patterns are common educational reference.
//
// Renders one of several layouts based on the question's skill:
//   1. A named 2D shape (triangle / square / rectangle / pentagon /
//      hexagon / octagon / circle) centred in the viewBox.
//   2. A "rect-with-dims" — a rectangle plus side labels for width and
//      height (used by the perimeter-rect / area-rect questions).
//   3. A right triangle with a labelled base and height (area-tri).
//   4. A circle with a labelled radius line (area-circle / circumference).
//   5. An angle figure — two rays from a vertex with an arc indicator
//      (angle-name).

import type { ShapeKind, ShapeQuestion, SolidKind } from './logic';

export type ShapeFigureMode =
  | ShapeKind
  | 'rect-with-dims'
  | 'right-triangle'
  | 'circle-with-radius'
  | 'angle'
  | 'angle-with-degrees'
  | 'solid'
  | 'symmetry-shape'
  | 'coord-grid';

type Mode = ShapeFigureMode;

interface Props {
  shape: Mode;
  question: ShapeQuestion;
  size?: number;
  className?: string;
}

// Common viewBox; the SVG scales via `size`.
const VB = 100;
const CX = 50;
const CY = 50;

// Compute the n vertices of a regular polygon inscribed in a circle.
// Rotation puts the first vertex straight up (angle = -π/2).
function regularPolygonPoints(n: number, radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = CX + radius * Math.cos(angle);
    const y = CY + radius * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

// Equilateral triangle (n=3) inscribed in the same radius.
function trianglePoints(radius: number): string {
  return regularPolygonPoints(3, radius);
}

// Rectangle wider than tall — picks an aspect ratio so it's visibly not a
// square. Width:Height = 7:4 inscribed in a 90-wide box.
function rectanglePoints(): string {
  const w = 70;
  const h = 40;
  const x0 = CX - w / 2;
  const y0 = CY - h / 2;
  return `${x0},${y0} ${x0 + w},${y0} ${x0 + w},${y0 + h} ${x0},${y0 + h}`;
}

// Aligned square (sides horizontal/vertical) so it reads as a square at a
// glance — not rotated like a generic regular polygon would be.
function squarePoints(): string {
  const s = 56;
  const x0 = CX - s / 2;
  const y0 = CY - s / 2;
  return `${x0},${y0} ${x0 + s},${y0} ${x0 + s},${y0 + s} ${x0},${y0 + s}`;
}

export function ShapeFigure({ shape, question, size = 200, className }: Props) {
  const radius = 40;

  if (
    shape === 'rect-with-dims' ||
    question.skill === 'perimeter-rect' ||
    question.skill === 'area-rect'
  ) {
    const w = question.width ?? 0;
    const h = question.height ?? 0;
    const units = question.units;
    // Render a rectangle with on-figure labels. The drawn box has a fixed
    // visual aspect — the labels carry the actual numeric dimensions.
    const drawW = 70;
    const drawH = 42;
    const x0 = CX - drawW / 2;
    const y0 = CY - drawH / 2;
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Rectangle ${w} by ${h} ${units}`}
      >
        <rect
          x={x0}
          y={y0}
          width={drawW}
          height={drawH}
          fill="white"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        {/* Top label: width */}
        <text
          x={CX}
          y={y0 - 2}
          textAnchor="middle"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          {w} {units}
        </text>
        {/* Right label: height */}
        <text
          x={x0 + drawW + 2}
          y={CY}
          textAnchor="start"
          dominantBaseline="central"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          {h} {units}
        </text>
      </svg>
    );
  }

  if (shape === 'right-triangle' || question.skill === 'area-tri') {
    const base = question.width ?? 0;
    const ht = question.height ?? 0;
    const units = question.units;
    // Right triangle: right angle at the bottom-left corner. Base along
    // the bottom, height up the left side, hypotenuse from top-left to
    // bottom-right. Sized to fill the viewBox; labels carry the numbers.
    const drawW = 64;
    const drawH = 44;
    const x0 = CX - drawW / 2;
    const y0 = CY - drawH / 2 + 6; // shift down so labels above fit
    const xR = x0 + drawW;
    const yB = y0 + drawH;
    const points = `${x0},${y0} ${x0},${yB} ${xR},${yB}`;
    // Tiny right-angle marker at the bottom-left corner.
    const markerSize = 4;
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Right triangle, base ${base} ${units}, height ${ht} ${units}`}
      >
        <polygon
          points={points}
          fill="white"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        {/* Right-angle marker (small square at the right-angle vertex). */}
        <polyline
          points={`${x0 + markerSize},${yB} ${x0 + markerSize},${yB - markerSize} ${x0},${yB - markerSize}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
        />
        {/* Base label, below the bottom edge. */}
        <text
          x={(x0 + xR) / 2}
          y={yB + 6}
          textAnchor="middle"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          base = {base} {units}
        </text>
        {/* Height label, to the left of the vertical side. */}
        <text
          x={x0 - 2}
          y={(y0 + yB) / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          h = {ht} {units}
        </text>
      </svg>
    );
  }

  if (
    shape === 'circle-with-radius' ||
    question.skill === 'area-circle' ||
    question.skill === 'circumference'
  ) {
    const r = question.radius ?? 0;
    const units = question.units;
    // Draw a circle, a radius line from the centre to the right, and a
    // small dot at the centre. The label "r = N units" sits along the
    // radius line.
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Circle, radius ${r} ${units}`}
      >
        <circle
          cx={CX}
          cy={CY}
          r={radius}
          fill="white"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        {/* Radius line — centre to the right edge of the circle. */}
        <line
          x1={CX}
          y1={CY}
          x2={CX + radius}
          y2={CY}
          stroke="currentColor"
          strokeWidth={1}
        />
        {/* Centre dot. */}
        <circle cx={CX} cy={CY} r={1.2} fill="currentColor" />
        {/* Label above the radius line. */}
        <text
          x={CX + radius / 2}
          y={CY - 2}
          textAnchor="middle"
          fontSize="6"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          r = {r} {units}
        </text>
      </svg>
    );
  }

  if (shape === 'angle' || question.skill === 'angle-name') {
    // Two rays from a common vertex. One ray goes horizontally right;
    // the second is rotated by `angle` degrees counter-clockwise. An
    // arc near the vertex indicates the measured angle. The category
    // string is the canonical answer — we deliberately don't put the
    // numeric degrees on the figure, so the kid can't read it off.
    const angleDeg = question.angle ?? 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const armLen = 36;
    // Vertex slightly down-and-left of centre so both rays have space.
    const vx = CX - 18;
    const vy = CY + 12;
    // First ray: horizontal to the right.
    const r1x = vx + armLen;
    const r1y = vy;
    // Second ray: rotated CCW by `angle`. SVG y grows downward, so we
    // negate sin to rotate counter-clockwise on screen.
    const r2x = vx + armLen * Math.cos(angleRad);
    const r2y = vy - armLen * Math.sin(angleRad);
    // Arc: small circular sweep at the vertex.
    const arcR = 10;
    const ax1 = vx + arcR;
    const ay1 = vy;
    const ax2 = vx + arcR * Math.cos(angleRad);
    const ay2 = vy - arcR * Math.sin(angleRad);
    const largeArc = angleDeg > 180 ? 1 : 0;
    // Sweep flag 0 = counter-clockwise in SVG's flipped-y space when we
    // walk from the horizontal ray to the rotated ray going "up".
    const sweep = 0;
    const arcPath = `M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${ax2} ${ay2}`;
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Angle of ${angleDeg} degrees`}
      >
        <line x1={vx} y1={vy} x2={r1x} y2={r1y} stroke="currentColor" strokeWidth={1.5} />
        <line x1={vx} y1={vy} x2={r2x} y2={r2y} stroke="currentColor" strokeWidth={1.5} />
        <path d={arcPath} fill="none" stroke="currentColor" strokeWidth={1} />
        {/* Vertex dot. */}
        <circle cx={vx} cy={vy} r={1.2} fill="currentColor" />
      </svg>
    );
  }

  if (
    shape === 'solid' ||
    question.skill === 'name-3d' ||
    question.skill === 'count-faces' ||
    question.skill === 'count-edges' ||
    question.skill === 'count-vertices'
  ) {
    const solid = question.solid ?? 'cube';
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={solid}
      >
        <SolidFigure solid={solid} />
      </svg>
    );
  }

  if (
    shape === 'angle-with-degrees' ||
    question.skill === 'angle-measure' ||
    question.skill === 'angle-name-reflex'
  ) {
    // Same two-ray layout as the angle figure, but for angle-measure we
    // draw a labelled arc using a real SVG arc path so the kid can read
    // a near-protractor figure. For angle-name-reflex we still hide the
    // numeric value (kid identifies the category).
    const angleDeg = question.angle ?? 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const armLen = 36;
    const vx = CX - 2;
    const vy = CY + 8;
    const r1x = vx + armLen;
    const r1y = vy;
    const r2x = vx + armLen * Math.cos(angleRad);
    const r2y = vy - armLen * Math.sin(angleRad);
    const arcR = 14;
    const ax1 = vx + arcR;
    const ay1 = vy;
    const ax2 = vx + arcR * Math.cos(angleRad);
    const ay2 = vy - arcR * Math.sin(angleRad);
    const largeArc = angleDeg > 180 ? 1 : 0;
    const sweep = 0;
    const arcPath = `M ${ax1} ${ay1} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${ax2} ${ay2}`;
    const showDegrees = question.skill === 'angle-measure';
    // Label position: midway round the arc, slightly out from the vertex.
    const midRad = angleRad / 2;
    const labelR = arcR + 6;
    const lx = vx + labelR * Math.cos(midRad);
    const ly = vy - labelR * Math.sin(midRad);
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Angle of ${angleDeg} degrees`}
      >
        <line x1={vx} y1={vy} x2={r1x} y2={r1y} stroke="currentColor" strokeWidth={1.5} />
        <line x1={vx} y1={vy} x2={r2x} y2={r2y} stroke="currentColor" strokeWidth={1.5} />
        <path d={arcPath} fill="none" stroke="currentColor" strokeWidth={1} />
        <circle cx={vx} cy={vy} r={1.2} fill="currentColor" />
        {showDegrees && (
          <text
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="6"
            fontWeight="bold"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            ?°
          </text>
        )}
      </svg>
    );
  }

  if (shape === 'symmetry-shape' || question.skill === 'lines-of-symmetry') {
    // Use the same polygon math as the named-shape branch but pass it
    // through this block so the figure is rendered WITHOUT any symmetry
    // lines drawn — the kid has to find them mentally.
    const k = question.shape ?? 'square';
    let points: string;
    if (k === 'triangle') points = trianglePoints(radius);
    else if (k === 'square') points = squarePoints();
    else if (k === 'rectangle') points = rectanglePoints();
    else if (k === 'pentagon') points = regularPolygonPoints(5, radius);
    else if (k === 'hexagon') points = regularPolygonPoints(6, radius);
    else if (k === 'octagon') points = regularPolygonPoints(8, radius);
    else points = '';
    if (k === 'circle') {
      return (
        <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label="circle">
          <circle cx={CX} cy={CY} r={radius} fill="white" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    }
    return (
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label={k}>
        <polygon points={points} fill="white" stroke="currentColor" strokeWidth={1.5} />
      </svg>
    );
  }

  if (
    shape === 'coord-grid' ||
    question.skill === 'coord-read' ||
    question.skill === 'coord-plot' ||
    question.skill === 'translation'
  ) {
    const gridMax = question.gridMax ?? 5;
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={`Coordinate grid 0..${gridMax}`}
      >
        <CoordGrid question={question} gridMax={gridMax} />
      </svg>
    );
  }

  if (shape === 'circle') {
    return (
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label="Circle"
      >
        <circle
          cx={CX}
          cy={CY}
          r={radius}
          fill="white"
          stroke="currentColor"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  let points: string;
  let label: string;
  if (shape === 'triangle') {
    points = trianglePoints(radius);
    label = 'Triangle';
  } else if (shape === 'square') {
    points = squarePoints();
    label = 'Square';
  } else if (shape === 'rectangle') {
    points = rectanglePoints();
    label = 'Rectangle';
  } else if (shape === 'pentagon') {
    points = regularPolygonPoints(5, radius);
    label = 'Pentagon';
  } else if (shape === 'hexagon') {
    points = regularPolygonPoints(6, radius);
    label = 'Hexagon';
  } else {
    // octagon
    points = regularPolygonPoints(8, radius);
    label = 'Octagon';
  }

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label}
    >
      <polygon
        points={points}
        fill="white"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Isometric 3D-solid helper. Renders one of the six SolidKind values as a
// 2D iso projection (30° depth axis) with hidden edges shown as dashes.
// All output is plain SVG elements — no external deps. The figure is drawn
// inside the standard 100×100 viewBox used by every other ShapeFigure
// branch.
// ---------------------------------------------------------------------------

interface SolidFigureProps {
  solid: SolidKind;
}

function SolidFigure({ solid }: SolidFigureProps) {
  // Depth offset for the iso projection — cos30/sin30 scaled to give a
  // pleasing visual depth without making the figure leave the box.
  const depth = 18;
  const dxIso = depth * Math.cos(Math.PI / 6); // ≈ 15.6
  const dyIso = -depth * Math.sin(Math.PI / 6); // ≈ -9 (up on screen)

  if (solid === 'cube' || solid === 'cuboid') {
    // Front rectangle ABCD + back rectangle A'B'C'D' offset by (dxIso, dyIso).
    const w = solid === 'cube' ? 38 : 50;
    const h = solid === 'cube' ? 38 : 28;
    const x0 = CX - w / 2 - dxIso / 2;
    const y0 = CY - h / 2 - dyIso / 2;
    const a = { x: x0, y: y0 + h };           // front bottom-left
    const b = { x: x0 + w, y: y0 + h };       // front bottom-right
    const c = { x: x0 + w, y: y0 };           // front top-right
    const d = { x: x0, y: y0 };               // front top-left
    const ap = { x: a.x + dxIso, y: a.y + dyIso };
    const bp = { x: b.x + dxIso, y: b.y + dyIso };
    const cp = { x: c.x + dxIso, y: c.y + dyIso };
    const dp = { x: d.x + dxIso, y: d.y + dyIso };
    // Visible: front face (a-b-c-d), top edges (d-dp, c-cp, dp-cp),
    // right edges (b-bp, c-cp again, bp-cp).
    // Hidden: ap (back bottom-left), the three edges meeting there.
    const visible = [
      [a, b], [b, c], [c, d], [d, a], // front rectangle
      [d, dp], [c, cp], [b, bp],       // perspective edges (visible 3)
      [dp, cp], [cp, bp],              // back top + right edges
    ];
    const hidden = [
      [a, ap],                          // bottom-left perspective edge
      [ap, dp],                         // back-left vertical
      [ap, bp],                         // back-bottom horizontal
    ];
    return (
      <g fill="none" stroke="currentColor">
        {visible.map(([p, q], i) => (
          <line key={`v${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={1.4} />
        ))}
        {hidden.map(([p, q], i) => (
          <line
            key={`h${i}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ))}
      </g>
    );
  }

  if (solid === 'cylinder') {
    // A vertical cylinder: top ellipse + body rect + bottom half-ellipse
    // (dashed). Drawn around the canvas centre.
    const rx = 22;
    const ry = 7;
    const halfH = 22;
    return (
      <g fill="none" stroke="currentColor">
        {/* Top ellipse — fully visible. */}
        <ellipse cx={CX} cy={CY - halfH} rx={rx} ry={ry} strokeWidth={1.4} />
        {/* Left side. */}
        <line x1={CX - rx} y1={CY - halfH} x2={CX - rx} y2={CY + halfH} strokeWidth={1.4} />
        {/* Right side. */}
        <line x1={CX + rx} y1={CY - halfH} x2={CX + rx} y2={CY + halfH} strokeWidth={1.4} />
        {/* Bottom — visible front half (a curve from (cx-rx, cy+halfH)
            sweeping down and back up to (cx+rx, cy+halfH)). */}
        <path
          d={`M ${CX - rx} ${CY + halfH} A ${rx} ${ry} 0 0 0 ${CX + rx} ${CY + halfH}`}
          strokeWidth={1.4}
        />
        {/* Bottom — hidden back half (dashed). */}
        <path
          d={`M ${CX - rx} ${CY + halfH} A ${rx} ${ry} 0 0 1 ${CX + rx} ${CY + halfH}`}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </g>
    );
  }

  if (solid === 'sphere') {
    // A circle with an inner ellipse hint (the "equator" longitude) so it
    // reads as a sphere, not just a circle. Half visible, half dashed.
    const r = 26;
    const rx = r;
    const ry = 8;
    return (
      <g fill="none" stroke="currentColor">
        <circle cx={CX} cy={CY} r={r} strokeWidth={1.4} />
        {/* Front half of the equator. */}
        <path
          d={`M ${CX - rx} ${CY} A ${rx} ${ry} 0 0 0 ${CX + rx} ${CY}`}
          strokeWidth={1}
        />
        {/* Back half of the equator (dashed = hidden). */}
        <path
          d={`M ${CX - rx} ${CY} A ${rx} ${ry} 0 0 1 ${CX + rx} ${CY}`}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </g>
    );
  }

  if (solid === 'cone') {
    // Apex on top, circular base at the bottom. Triangle + ellipse.
    const apex = { x: CX, y: CY - 26 };
    const baseCy = CY + 18;
    const rx = 22;
    const ry = 6;
    return (
      <g fill="none" stroke="currentColor">
        {/* Slant edges. */}
        <line x1={apex.x} y1={apex.y} x2={CX - rx} y2={baseCy} strokeWidth={1.4} />
        <line x1={apex.x} y1={apex.y} x2={CX + rx} y2={baseCy} strokeWidth={1.4} />
        {/* Front half of base ellipse — solid. */}
        <path
          d={`M ${CX - rx} ${baseCy} A ${rx} ${ry} 0 0 0 ${CX + rx} ${baseCy}`}
          strokeWidth={1.4}
        />
        {/* Back half of base — dashed. */}
        <path
          d={`M ${CX - rx} ${baseCy} A ${rx} ${ry} 0 0 1 ${CX + rx} ${baseCy}`}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </g>
    );
  }

  // pyramid (square-base).
  // 4 visible edges (apex to front 3 base corners) + 2 visible base edges
  // (front-left to front-right, front-right to back-right) + 2 hidden
  // edges (apex to back-left corner, back-left to back-right base edge,
  // back-left to front-left base edge).
  const apex = { x: CX + dxIso / 2, y: CY - 24 };
  const w = 38;
  const baseH = 14;
  const fl = { x: CX - w / 2, y: CY + 18 };          // front-left
  const fr = { x: CX + w / 2, y: CY + 18 };          // front-right
  const br = { x: fr.x + dxIso, y: fr.y + dyIso - baseH * 0 }; // back-right
  const bl = { x: fl.x + dxIso, y: fl.y + dyIso };   // back-left (hidden corner)
  return (
    <g fill="none" stroke="currentColor">
      {/* Visible apex slants (front-left, front-right, back-right). */}
      <line x1={apex.x} y1={apex.y} x2={fl.x} y2={fl.y} strokeWidth={1.4} />
      <line x1={apex.x} y1={apex.y} x2={fr.x} y2={fr.y} strokeWidth={1.4} />
      <line x1={apex.x} y1={apex.y} x2={br.x} y2={br.y} strokeWidth={1.4} />
      {/* Visible base edges. */}
      <line x1={fl.x} y1={fl.y} x2={fr.x} y2={fr.y} strokeWidth={1.4} />
      <line x1={fr.x} y1={fr.y} x2={br.x} y2={br.y} strokeWidth={1.4} />
      {/* Hidden: apex-to-back-left + the two base edges that meet there. */}
      <line x1={apex.x} y1={apex.y} x2={bl.x} y2={bl.y} strokeWidth={1} strokeDasharray="3,3" />
      <line x1={fl.x} y1={fl.y} x2={bl.x} y2={bl.y} strokeWidth={1} strokeDasharray="3,3" />
      <line x1={bl.x} y1={bl.y} x2={br.x} y2={br.y} strokeWidth={1} strokeDasharray="3,3" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Coordinate-grid helper. Renders a first-quadrant grid from (0,0) to
// (gridMax, gridMax) with axis labels and (optionally) a marker dot at
// the point carried by the question. For coord-plot we draw nothing on
// the figure — the kid picks the location via the button-grid input.
// ---------------------------------------------------------------------------

interface CoordGridProps {
  question: ShapeQuestion;
  gridMax: number;
}

function CoordGrid({ question, gridMax }: CoordGridProps) {
  // Use most of the viewBox; leave a margin on the left/bottom for axis
  // labels.
  const margin = 12;
  const usable = VB - margin - 6;
  const step = usable / gridMax;
  const x0 = margin;
  const y0 = VB - margin;
  const toPx = (x: number, y: number) => ({
    px: x0 + x * step,
    py: y0 - y * step,
  });

  const ticks: number[] = [];
  // Limit tick labels: every value when gridMax ≤ 10, every 2 when ≤ 20.
  const tickStep = gridMax <= 10 ? 1 : 2;
  for (let i = 0; i <= gridMax; i += tickStep) ticks.push(i);

  // Marker: shown for coord-read (the kid reads the marked point) and
  // translation (start point). For coord-plot we omit it.
  let marker: { x: number; y: number } | null = null;
  if (question.skill === 'coord-read' && question.point) marker = question.point;
  if (question.skill === 'translation' && question.point) marker = question.point;

  return (
    <g>
      {/* Grid lines. */}
      <g stroke="currentColor" strokeWidth={0.2} opacity={0.5}>
        {Array.from({ length: gridMax + 1 }, (_, i) => {
          const p = toPx(i, 0);
          const top = toPx(i, gridMax);
          return <line key={`v${i}`} x1={p.px} y1={p.py} x2={top.px} y2={top.py} />;
        })}
        {Array.from({ length: gridMax + 1 }, (_, i) => {
          const p = toPx(0, i);
          const right = toPx(gridMax, i);
          return <line key={`h${i}`} x1={p.px} y1={p.py} x2={right.px} y2={right.py} />;
        })}
      </g>
      {/* Axes. */}
      <g stroke="currentColor" strokeWidth={0.8}>
        <line x1={x0} y1={y0} x2={x0 + gridMax * step} y2={y0} />
        <line x1={x0} y1={y0} x2={x0} y2={y0 - gridMax * step} />
      </g>
      {/* Tick labels. */}
      <g fill="currentColor" fontSize="4" fontFamily="sans-serif">
        {ticks.map(t => {
          const p = toPx(t, 0);
          return (
            <text key={`tx${t}`} x={p.px} y={p.py + 4} textAnchor="middle">
              {t}
            </text>
          );
        })}
        {ticks.map(t => {
          const p = toPx(0, t);
          return (
            <text key={`ty${t}`} x={p.px - 2} y={p.py + 1.5} textAnchor="end">
              {t}
            </text>
          );
        })}
      </g>
      {/* Marker dot. */}
      {marker && (
        <g>
          <circle
            cx={toPx(marker.x, marker.y).px}
            cy={toPx(marker.x, marker.y).py}
            r={1.8}
            fill="currentColor"
          />
        </g>
      )}
    </g>
  );
}
