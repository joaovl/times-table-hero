// SVG bar chart rendered with primitives — axes via line, bars via rect,
// labels via text. Standard charting fundamentals; many tutorials and
// libraries (D3, Chart.js, Recharts) describe the same approach. We avoid
// those libraries to stay dep-free.

import type { ChartCategory } from './logic';
import { axisMax, axisTickCount } from './logic';

interface Props {
  categories: ChartCategory[];
  /** Indices into `categories` that should render with a stronger fill. */
  highlightIndices?: number[];
  /** CSS width of the rendered chart. Defaults to 320. */
  width?: number;
  /** CSS height of the rendered chart. Defaults to 240. */
  height?: number;
  className?: string;
  /** Axis title shown beside the y-axis (e.g. "votes"). Optional. */
  unit?: string;
}

const VIEW_W = 320;
const VIEW_H = 240;

// Inner plotting area within the viewBox. Leaves room for axis labels.
const PAD_LEFT = 38;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 36;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

export function BarChart({
  categories,
  highlightIndices = [],
  width = VIEW_W,
  height = VIEW_H,
  className,
  unit,
}: Props) {
  const highlight = new Set(highlightIndices);
  const dataMax = categories.reduce((m, c) => Math.max(m, c.value), 0);
  const yMax = axisMax(dataMax);
  const ticks = axisTickCount(yMax);

  // Bar geometry: equal-width columns with gaps between.
  const n = Math.max(1, categories.length);
  const slot = PLOT_W / n;
  const barW = Math.max(8, slot * 0.65);

  // Long labels (e.g. "Football") risk overlap when packed into 6-7 columns.
  // Rotate -45 degrees when the column slot is narrower than the label needs.
  const rotateLabels = n >= 6;

  // Y-axis numeric labels — sized to fit within PAD_LEFT.
  const yLabels: Array<{ v: number; y: number }> = [];
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax * i) / ticks;
    const y = PAD_TOP + PLOT_H - (v / yMax) * PLOT_H;
    yLabels.push({ v: Math.round(v), y });
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Bar chart with ${categories.length} categories`}
    >
      {/* Gridlines */}
      {yLabels.map((t, i) => (
        <line
          key={`grid-${i}`}
          x1={PAD_LEFT}
          y1={t.y}
          x2={PAD_LEFT + PLOT_W}
          y2={t.y}
          stroke="currentColor"
          strokeOpacity={i === 0 ? 0.8 : 0.18}
          strokeWidth={i === 0 ? 1 : 0.6}
        />
      ))}

      {/* Y-axis */}
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP}
        x2={PAD_LEFT}
        y2={PAD_TOP + PLOT_H}
        stroke="currentColor"
        strokeWidth={1}
      />

      {/* Y-axis numeric labels */}
      {yLabels.map((t, i) => (
        <text
          key={`yl-${i}`}
          x={PAD_LEFT - 4}
          y={t.y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize="10"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          {t.v}
        </text>
      ))}

      {/* Optional unit label, rotated, beside the axis */}
      {unit && (
        <text
          x={10}
          y={PAD_TOP + PLOT_H / 2}
          transform={`rotate(-90 10 ${PAD_TOP + PLOT_H / 2})`}
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          {unit}
        </text>
      )}

      {/* Bars */}
      {categories.map((c, i) => {
        const barH = (c.value / yMax) * PLOT_H;
        const x = PAD_LEFT + i * slot + (slot - barW) / 2;
        const y = PAD_TOP + PLOT_H - barH;
        const isHi = highlight.has(i);
        return (
          <g key={`bar-${i}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="currentColor"
              fillOpacity={isHi ? 0.9 : 0.45}
              stroke="currentColor"
              strokeWidth={isHi ? 1.5 : 0.6}
            />
            {/* Value label centered above each bar */}
            <text
              x={x + barW / 2}
              y={y - 3}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              fontFamily="sans-serif"
            >
              {c.value}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {categories.map((c, i) => {
        const cx = PAD_LEFT + i * slot + slot / 2;
        const labelY = PAD_TOP + PLOT_H + 12;
        if (rotateLabels) {
          return (
            <text
              key={`xl-${i}`}
              x={cx}
              y={labelY}
              transform={`rotate(-45 ${cx} ${labelY})`}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              fontFamily="sans-serif"
            >
              {c.label}
            </text>
          );
        }
        return (
          <text
            key={`xl-${i}`}
            x={cx}
            y={labelY}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            {c.label}
          </text>
        );
      })}
    </svg>
  );
}
