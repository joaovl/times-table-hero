// Analog clock SVG is a standard 12-position face with two hands; many
// open-source examples exist (e.g. CodePen / SVG tutorials). Pure
// primitives, no library dependency.

interface Props {
  hours: number;   // 0..23 (display logic converts to 12h face)
  minutes: number; // 0..59
  size?: number;   // pixels (CSS); SVG scales via viewBox
  className?: string;
}

/**
 * Standard analog clock face. Renders:
 *   - outer circle
 *   - 12 hour numerals
 *   - 5-minute tick marks (with the hour ticks slightly longer)
 *   - hour hand (~55% of radius) and minute hand (~85% of radius)
 *   - center pin
 *
 * Hour hand angle accounts for minute progression (i.e. at 3:30 the hour
 * hand is halfway between 3 and 4).
 */
export function ClockDisplay({ hours, minutes, size = 200, className }: Props) {
  // SVG coordinate space is a constant 100x100; the viewBox handles scaling.
  const cx = 50;
  const cy = 50;
  const radius = 47;

  // Hour hand: 30° per hour + 0.5° per minute. Minute hand: 6° per minute.
  // Display the hour as 1..12 by taking modulo 12.
  const h12 = ((hours % 12) + 12) % 12;
  const hourAngle = (h12 * 30 + minutes * 0.5) * (Math.PI / 180);
  const minuteAngle = minutes * 6 * (Math.PI / 180);

  // Hand lengths (proportional to radius).
  const hourLen = radius * 0.55;
  const minuteLen = radius * 0.85;

  // Compute hand endpoints. SVG y grows downward, so we subtract cos*len for y.
  const hourX = cx + hourLen * Math.sin(hourAngle);
  const hourY = cy - hourLen * Math.cos(hourAngle);
  const minuteX = cx + minuteLen * Math.sin(minuteAngle);
  const minuteY = cy - minuteLen * Math.cos(minuteAngle);

  // Tick marks at every 6° (60 ticks). Hour ticks (every 5th) are drawn longer.
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isHourTick = i % 5 === 0;
    const angle = i * 6 * (Math.PI / 180);
    const inner = isHourTick ? radius - 4 : radius - 2;
    const outer = radius;
    const x1 = cx + inner * Math.sin(angle);
    const y1 = cy - inner * Math.cos(angle);
    const x2 = cx + outer * Math.sin(angle);
    const y2 = cy - outer * Math.cos(angle);
    return { isHourTick, x1, y1, x2, y2, key: i };
  });

  // 12 hour numerals positioned just inside the tick ring.
  const numeralRadius = radius - 9;
  const numerals = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1; // 1..12 at angles 30°, 60°, ..., 360°
    const angle = hour * 30 * (Math.PI / 180);
    const x = cx + numeralRadius * Math.sin(angle);
    const y = cy - numeralRadius * Math.cos(angle);
    return { hour, x, y };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Clock showing ${h12 || 12}:${minutes.toString().padStart(2, '0')}`}
    >
      {/* Face */}
      <circle cx={cx} cy={cy} r={radius} fill="white" stroke="currentColor" strokeWidth={1.5} />

      {/* Tick marks */}
      {ticks.map(t => (
        <line
          key={t.key}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="currentColor"
          strokeWidth={t.isHourTick ? 1.2 : 0.5}
          strokeLinecap="round"
        />
      ))}

      {/* Hour numerals */}
      {numerals.map(n => (
        <text
          key={n.hour}
          x={n.x}
          y={n.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8"
          fontWeight="bold"
          fill="currentColor"
          fontFamily="sans-serif"
        >
          {n.hour}
        </text>
      ))}

      {/* Hour hand */}
      <line
        x1={cx}
        y1={cy}
        x2={hourX}
        y2={hourY}
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1={cx}
        y1={cy}
        x2={minuteX}
        y2={minuteY}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />

      {/* Center pin */}
      <circle cx={cx} cy={cy} r={1.8} fill="currentColor" />
    </svg>
  );
}
