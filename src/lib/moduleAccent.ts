// Signature color per module — the single source of module identity.
// Phase 1 uses it on the Hub tiles (icon color + soft chip background);
// later premium phases reuse it for setup headers, progress bars and
// celebrations. Values are theme-safe mid-saturation HSL that read well on
// both light and dark grounds; `soft` is the same hue at low alpha for
// tinted chip backgrounds.
export interface ModuleAccent {
  /** Solid accent, e.g. for icons/glyphs. */
  color: string;
  /** Low-alpha tint of the same hue, e.g. for icon chip backgrounds. */
  soft: string;
}

const accent = (h: number, s = 70, l = 48): ModuleAccent => ({
  color: `hsl(${h} ${s}% ${l}%)`,
  soft: `hsl(${h} ${s}% ${l}% / 0.14)`,
});

export const MODULE_ACCENT: Record<string, ModuleAccent> = {
  'times-tables': accent(258),      // violet — the hero module
  arithmetic: accent(217),          // blue
  time: accent(190, 75, 40),        // teal
  fractions: accent(282),           // purple
  shapes: accent(152, 60, 38),      // green
  charts: accent(24, 85, 50),       // orange
  'number-sense': accent(200, 80, 44), // sky
  money: accent(45, 90, 42),        // gold
  decimals: accent(330, 70, 50),    // pink
  'number-theory': accent(238),     // indigo
  conversions: accent(174, 60, 38), // sea green
  'word-problems': accent(12, 75, 50), // coral
  'ratio-proportion': accent(300, 55, 45), // magenta
  algebra: accent(262, 55, 52),     // lavender
  statistics: accent(88, 55, 38),   // olive green
};

export function moduleAccent(slug: string): ModuleAccent {
  return MODULE_ACCENT[slug] ?? accent(258);
}
