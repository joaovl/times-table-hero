// SVG line chart rendered with primitives — axes via line, points via circle,
// the trace via polyline. Standard charting fundamentals; we avoid external
// libraries to stay dep-free.

import type { ChartCategory } from './logic';
import { axisMax, axisTickCount } from './logic';

interface Props {
  categories: ChartCategory[];
  /** Indices into `categories` whose point should render with a stronger fill / ring. */
  highlightIndices?: number[];
  /** CSS width of the rendered chart. Defaults to 320. */
  width?: number;
  /** CSS height of the rendered chart. Defaults to 240. */
  height?: number;
  className?: string;
  /** Axis title shown beside the y-axis (e.g. "visitors"). Optional. */
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

export function LineChart({
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

  // Point geometry: evenly spaced across the plot. With n points we use
  // n-1 intervals so the first/last points touch the y-axis and the right
  // edge — typical for time-series line graphs.
  const n = Math.max(1, categories.length);
  const stepX = n > 1 ? PLOT_W / (n - 1) : PLOT_W / 2;

  const xFor = (i: number) => (n > 1 ? PAD_LEFT + i * stepX : PAD_LEFT + PLOT_W / 2);
  const yFor = (v: number) => PAD_TOP + PLOT_H - (v / yMax) * PLOT_H;

  // Y-axis numeric labels.
  const yLabels: Array<{ v: number; y: number }> = [];
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax * i) / ticks;
    yLabels.push({ v: Math.round(v), y: yFor(v) });
  }

  const polyPoints = categories.map((c, i) => `${xFor(i)},${yFor(c.value)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Line chart with ${categories.length} points`}
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

      {/* Line trace */}
      <polyline
        points={polyPoints}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.85}
        strokeWidth={2}
      />

      {/* Points */}
      {categories.map((c, i) => {
        const cx = xFor(i);
        const cy = yFor(c.value);
        const isHi = highlight.has(i);
        return (
          <g key={`pt-${i}`}>
            {isHi && (
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={isHi ? 4 : 3}
              fill="currentColor"
              fillOpacity={isHi ? 1 : 0.7}
              stroke="currentColor"
              strokeWidth={isHi ? 1.5 : 0.8}
            />
            {/* Value label above each point */}
            <text
              x={cx}
              y={cy - 8}
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
        const cx = xFor(i);
        const labelY = PAD_TOP + PLOT_H + 12;
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
