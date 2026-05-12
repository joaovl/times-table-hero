// SVG figure renderer for the figure-based conversion skills:
//   - perimeter-composite: L-shape or T-shape (or rect fallback) with each
//     edge labelled.
//   - area-irregular: grid with shaded cells filled grey.
//   - volume-cube: 2D isometric-ish projection (3 visible faces).
//   - volume-cuboid: same projection but for a non-cube cuboid.

import type { ConversionQuestion, FigureSpecL, FigureSpecT, FigureSpecRect } from './logic';

interface Props {
  question: ConversionQuestion;
  size?: number;
  className?: string;
}

const VB = 100;

export function ConversionFigure({ question, size = 220, className }: Props) {
  if (question.skill === 'perimeter-composite') {
    return (
      <PerimeterCompositeFigure
        question={question}
        size={size}
        className={className}
      />
    );
  }
  if (question.skill === 'area-irregular') {
    return <AreaIrregularFigure question={question} size={size} className={className} />;
  }
  if (question.skill === 'volume-cube') {
    return <VolumeCubeFigure question={question} size={size} className={className} />;
  }
  if (question.skill === 'volume-cuboid') {
    return <VolumeCuboidFigure question={question} size={size} className={className} />;
  }
  return null;
}

// --- Composite-perimeter -------------------------------------------------

function PerimeterCompositeFigure({
  question,
  size,
  className,
}: {
  question: Extract<ConversionQuestion, { skill: 'perimeter-composite' }>;
  size: number;
  className?: string;
}) {
  const { layout, figureSpec, unit } = question;
  // Fit-to-viewBox helpers. We map figure-space (cm) to a 0..VB box,
  // preserving aspect ratio with a margin so labels have room.
  const margin = 14;
  const inner = VB - 2 * margin;

  if (layout === 'rect') {
    const spec = figureSpec as FigureSpecRect;
    const maxDim = Math.max(spec.w, spec.h);
    const px = inner / maxDim;
    const w = spec.w * px;
    const h = spec.h * px;
    const x0 = (VB - w) / 2;
    const y0 = (VB - h) / 2;
    return (
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label={`Rectangle ${spec.w} by ${spec.h} ${unit}`}>
        <rect x={x0} y={y0} width={w} height={h} fill="white" stroke="currentColor" strokeWidth={1.2} />
        <text x={x0 + w / 2} y={y0 - 2} textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.w} {unit}</text>
        <text x={x0 + w + 2} y={y0 + h / 2} textAnchor="start" dominantBaseline="central" fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.h} {unit}</text>
      </svg>
    );
  }

  if (layout === 'L') {
    const spec = figureSpec as FigureSpecL;
    const maxDim = Math.max(spec.outerW, spec.outerH);
    const px = inner / maxDim;
    const W = spec.outerW * px;
    const H = spec.outerH * px;
    const cW = spec.cutW * px;
    const cH = spec.cutH * px;
    const x0 = (VB - W) / 2;
    const y0 = (VB - H) / 2;
    // L-shape polygon: outer rectangle minus a cut at the bottom-right.
    //  topL=(x0,y0) topR=(x0+W,y0) cutTL=(x0+W,y0+H-cH)
    //  cutTR=(x0+W-cW,y0+H-cH) cutBL=(x0+W-cW,y0+H) bottomL=(x0,y0+H)
    const points = [
      `${x0},${y0}`,
      `${x0 + W},${y0}`,
      `${x0 + W},${y0 + H - cH}`,
      `${x0 + W - cW},${y0 + H - cH}`,
      `${x0 + W - cW},${y0 + H}`,
      `${x0},${y0 + H}`,
    ].join(' ');
    return (
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label="L-shape">
        <polygon points={points} fill="white" stroke="currentColor" strokeWidth={1.2} />
        {/* Edge labels — same order as q.edges. */}
        <text x={x0 + W / 2} y={y0 - 2} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.outerW} {unit}</text>
        <text x={x0 + W + 2} y={y0 + (H - cH) / 2} dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.outerH - spec.cutH} {unit}</text>
        <text x={x0 + W - cW / 2} y={y0 + H - cH - 1.5} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.cutW} {unit}</text>
        <text x={x0 + W - cW + 1.5} y={y0 + H - cH / 2} dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.cutH} {unit}</text>
        <text x={x0 + (W - cW) / 2} y={y0 + H + 5} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.outerW - spec.cutW} {unit}</text>
        <text x={x0 - 2} y={y0 + H / 2} textAnchor="end" dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.outerH} {unit}</text>
      </svg>
    );
  }

  // T-shape
  const spec = figureSpec as FigureSpecT;
  const totalW = spec.topW;
  const totalH = spec.topH + spec.stemH;
  const maxDim = Math.max(totalW, totalH);
  const px = inner / maxDim;
  const tW = spec.topW * px;
  const tH = spec.topH * px;
  const sW = spec.stemW * px;
  const sH = spec.stemH * px;
  const x0 = (VB - tW) / 2;
  const y0 = (VB - (tH + sH)) / 2;
  const shoulderPx = (tW - sW) / 2;
  // Polygon (CW from top-left of top bar): topL, topR, downRightOfTop,
  // shoulderRight, stemRightBottom, stemLeftBottom, shoulderLeft,
  // downLeftOfTop.
  const points = [
    `${x0},${y0}`,
    `${x0 + tW},${y0}`,
    `${x0 + tW},${y0 + tH}`,
    `${x0 + tW - shoulderPx},${y0 + tH}`,
    `${x0 + tW - shoulderPx},${y0 + tH + sH}`,
    `${x0 + shoulderPx},${y0 + tH + sH}`,
    `${x0 + shoulderPx},${y0 + tH}`,
    `${x0},${y0 + tH}`,
  ].join(' ');
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label="T-shape">
      <polygon points={points} fill="white" stroke="currentColor" strokeWidth={1.2} />
      <text x={x0 + tW / 2} y={y0 - 2} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.topW} {unit}</text>
      <text x={x0 + tW + 2} y={y0 + tH / 2} dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.topH} {unit}</text>
      <text x={x0 + tW - shoulderPx / 2} y={y0 + tH - 1.5} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{(spec.topW - spec.stemW) / 2} {unit}</text>
      <text x={x0 + tW - shoulderPx + 1.5} y={y0 + tH + sH / 2} dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.stemH} {unit}</text>
      <text x={x0 + tW / 2} y={y0 + tH + sH + 5} textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.stemW} {unit}</text>
      <text x={x0 - 2} y={y0 + tH / 2} textAnchor="end" dominantBaseline="central" fontSize="5.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">{spec.topH} {unit}</text>
    </svg>
  );
}

// --- Irregular area ------------------------------------------------------

function AreaIrregularFigure({
  question,
  size,
  className,
}: {
  question: Extract<ConversionQuestion, { skill: 'area-irregular' }>;
  size: number;
  className?: string;
}) {
  const rows = question.grid.length;
  const cols = question.grid[0]?.length ?? 0;
  const margin = 8;
  const inner = VB - 2 * margin;
  const cellSize = inner / Math.max(rows, cols);
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  const x0 = (VB - gridW) / 2;
  const y0 = (VB - gridH) / 2;

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label="Grid with shaded squares to count">
      {question.grid.map((row, ry) =>
        row.map((shaded, cx) => (
          <rect
            key={`${ry}-${cx}`}
            x={x0 + cx * cellSize}
            y={y0 + ry * cellSize}
            width={cellSize}
            height={cellSize}
            fill={shaded ? '#b4b4b4' : 'white'}
            stroke="currentColor"
            strokeWidth={0.4}
          />
        ))
      )}
    </svg>
  );
}

// --- Volume cube + cuboid (isometric-ish projection) --------------------

function VolumeCubeFigure({
  question,
  size,
  className,
}: {
  question: Extract<ConversionQuestion, { skill: 'volume-cube' }>;
  size: number;
  className?: string;
}) {
  const s = question.side;
  return (
    <CuboidSvg
      L={s}
      W={s}
      H={s}
      unit="cm"
      size={size}
      className={className}
      ariaLabel={`Cube side ${s} cm`}
    />
  );
}

function VolumeCuboidFigure({
  question,
  size,
  className,
}: {
  question: Extract<ConversionQuestion, { skill: 'volume-cuboid' }>;
  size: number;
  className?: string;
}) {
  return (
    <CuboidSvg
      L={question.length}
      W={question.width}
      H={question.height}
      unit="cm"
      size={size}
      className={className}
      ariaLabel={`Cuboid ${question.length} by ${question.width} by ${question.height} cm`}
    />
  );
}

/**
 * Render a cuboid as a 2D isometric-ish projection — three visible faces
 * with edges and small length / width / height labels. The visual size of
 * each axis is fixed (independent of the real L/W/H numbers) so the figure
 * stays legible; the dimensions appear as text on the corresponding edges.
 */
function CuboidSvg({
  L,
  W,
  H,
  unit,
  size,
  className,
  ariaLabel,
}: {
  L: number;
  W: number;
  H: number;
  unit: string;
  size: number;
  className?: string;
  ariaLabel: string;
}) {
  // Fixed visual proportions — the labels carry the real numbers.
  const front = { w: 50, h: 36 };
  const dx = 16;
  const dy = -12;
  // Anchor front face top-left.
  const fx = 20;
  const fy = 36;
  const FTL = { x: fx, y: fy };
  const FTR = { x: fx + front.w, y: fy };
  const FBR = { x: fx + front.w, y: fy + front.h };
  const FBL = { x: fx, y: fy + front.h };
  const BTL = { x: FTL.x + dx, y: FTL.y + dy };
  const BTR = { x: FTR.x + dx, y: FTR.y + dy };
  const BBR = { x: FBR.x + dx, y: FBR.y + dy };

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className={className} role="img" aria-label={ariaLabel}>
      {/* Top face */}
      <polygon
        points={`${FTL.x},${FTL.y} ${FTR.x},${FTR.y} ${BTR.x},${BTR.y} ${BTL.x},${BTL.y}`}
        fill="white"
        stroke="currentColor"
        strokeWidth={1}
      />
      {/* Right face */}
      <polygon
        points={`${FTR.x},${FTR.y} ${FBR.x},${FBR.y} ${BBR.x},${BBR.y} ${BTR.x},${BTR.y}`}
        fill="white"
        stroke="currentColor"
        strokeWidth={1}
      />
      {/* Front face */}
      <polygon
        points={`${FTL.x},${FTL.y} ${FTR.x},${FTR.y} ${FBR.x},${FBR.y} ${FBL.x},${FBL.y}`}
        fill="white"
        stroke="currentColor"
        strokeWidth={1}
      />
      {/* Length label — along front bottom edge. */}
      <text x={(FTL.x + FTR.x) / 2} y={FBR.y + 5} textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">
        {L} {unit}
      </text>
      {/* Height label — to the left of the front face. */}
      <text x={FTL.x - 2} y={(FTL.y + FBL.y) / 2} textAnchor="end" dominantBaseline="central" fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">
        {H} {unit}
      </text>
      {/* Width label — along the top-right depth edge. */}
      <text x={(FTR.x + BTR.x) / 2 + 3} y={(FTR.y + BTR.y) / 2 - 1} fontSize="6" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">
        {W} {unit}
      </text>
    </svg>
  );
}
