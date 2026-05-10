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

import type { ShapeKind, ShapeQuestion } from './logic';

type Mode = ShapeKind | 'rect-with-dims' | 'right-triangle' | 'circle-with-radius' | 'angle';

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
