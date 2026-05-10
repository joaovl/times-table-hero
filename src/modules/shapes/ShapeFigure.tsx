// Regular polygon vertices computed via standard trig (i*2π/n around the
// center). SVG patterns are common educational reference.
//
// Renders one of two layouts:
//   1. A named 2D shape (triangle / square / rectangle / pentagon / hexagon /
//      octagon / circle) centred in the viewBox.
//   2. A "rect-with-dims" — a rectangle plus side labels for width and
//      height (used by the perimeter-rect / area-rect questions).

import type { ShapeKind, ShapeQuestion } from './logic';

type Mode = ShapeKind | 'rect-with-dims';

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

  if (shape === 'rect-with-dims' || question.skill === 'perimeter-rect' || question.skill === 'area-rect') {
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
