// SVG pie chart rendered with primitives — sectors via path arcs, labels via
// text. Standard charting fundamentals; we avoid external libraries to stay
// dep-free.

import type { ChartCategory } from './logic';
import { buildPieSlices } from './logic';

interface Props {
  categories: ChartCategory[];
  /** Indices into `categories` whose slice should render with a stronger outline. */
  highlightIndices?: number[];
  /** CSS width of the rendered chart. Defaults to 320. */
  width?: number;
  /** CSS height of the rendered chart. Defaults to 260. */
  height?: number;
  className?: string;
}

const VIEW_W = 320;
const VIEW_H = 260;

// Pie is centered in the top portion of the viewBox; legend sits below.
const PIE_CX = VIEW_W / 2;
const PIE_CY = 110;
const PIE_R = 90;
const LEGEND_TOP = 215;

// Alternating warm/cool palette — picks complement the kid-friendly UI and
// stay visually distinct under default Tailwind backgrounds.
const SLICE_FILLS = [
  'hsl(210 80% 70%)', // light blue
  'hsl(140 55% 65%)', // light green
  'hsl(45 90% 70%)',  // light yellow
  'hsl(330 70% 75%)', // light pink
];

function sectorPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  // Clockwise sweep (sweep-flag=1).
  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z',
  ].join(' ');
}

export function PieChart({
  categories,
  highlightIndices = [],
  width = VIEW_W,
  height = VIEW_H,
  className,
}: Props) {
  const highlight = new Set(highlightIndices);
  const values = categories.map(c => c.value);
  const slices = buildPieSlices(values);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Pie chart with ${categories.length} slices`}
    >
      {/* Slices */}
      {slices.map((s, i) => {
        const hi = highlight.has(i);
        const fill = SLICE_FILLS[i % SLICE_FILLS.length];
        return (
          <path
            key={`slice-${i}`}
            d={sectorPath(PIE_CX, PIE_CY, PIE_R, s.startAngle, s.endAngle)}
            fill={fill}
            stroke="currentColor"
            strokeWidth={hi ? 3 : 1}
            strokeOpacity={hi ? 1 : 0.6}
          />
        );
      })}

      {/* Legend — 2 columns of swatch + label below the pie. */}
      {categories.map((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const lx = col === 0 ? PIE_CX - 100 : PIE_CX + 6;
        const ly = LEGEND_TOP + row * 18;
        const fill = SLICE_FILLS[i % SLICE_FILLS.length];
        const hi = highlight.has(i);
        return (
          <g key={`leg-${i}`}>
            <rect
              x={lx}
              y={ly - 8}
              width={10}
              height={10}
              fill={fill}
              stroke="currentColor"
              strokeWidth={hi ? 2 : 0.6}
            />
            <text
              x={lx + 15}
              y={ly}
              fontSize="11"
              fill="currentColor"
              fontFamily="sans-serif"
              dominantBaseline="central"
            >
              {c.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
