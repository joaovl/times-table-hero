# Future Modules Roadmap

**Date:** 2026-05-10
**Status:** Roadmap — non-binding, sets the picture before each module's own spec.

The Hub already promises four future modules: **Charts · Time · Shapes · Fractions**. This doc gives each a clear picture so we know roughly what's coming, where the shared patterns are, and what order to build them. Each one becomes its own spec → plan → implementation cycle when its turn comes.

## What every module shares (already-established pattern)

The arithmetic and times-tables modules locked in a repeatable shape. Every new module follows it:

- **Self-contained folder** `src/modules/<name>/` with: `<Name>Index.tsx`, `<Name>Setup.tsx`, `<Name>Play.tsx`, `<Name>Results.tsx`, `logic.ts`, `pdf.ts`, `storage.ts`, `printConfig.ts`.
- **Hub card** → routes to `/<module>` → setup → play → results.
- **Setup screen** with op/skill picker, difficulty, game mode, "Print Worksheet" + "Let's Go!" CTAs.
- **Print modal** with page count + questions per page (op-aware caps), summary line, optional answer key.
- **PDF**: question numbering across pages, optional answer-key page, encoding-safe glyphs only.
- **Storage**: namespaced keys `<module>-settings`, `<module>-printSettings`, `<module>-sessions`.
- **Tests**: logic unit tests, PDF round-trip tests with mocked jsPDF, end-to-end matrix that walks every modal selection.

## Recommended ship order

| # | Module | Why first | Effort |
|---|--------|-----------|--------|
| 1 | **Division** (finish arithmetic) | Same shape as multiply; finishes the module already on the Hub. | S |
| 2 | **Time** | High everyday-use; SVG analog clock is one component; only kid input is hh:mm. | M |
| 3 | **Fractions** | Many small skills, each ships incrementally. | M |
| 4 | **Shapes** | Broad domain; SVG render is more work but skills are bite-sized. | L |
| 5 | **Charts** | Heaviest render (bars/pies/axes/legends); narrowest pedagogical scope. | L |

Each module ships independently. We can pause after any of them and get user feedback before continuing.

---

## 1. Division (finish arithmetic)

Already specced informally. Bringing it explicit here.

**Skills:**
- Single-digit facts (28 ÷ 4)
- 2-digit ÷ 1-digit, 3-digit ÷ 1-digit, 3-digit ÷ 2-digit, 4-digit ÷ 1-digit, 4-digit ÷ 2-digit, 5-digit ÷ 1-digit
- With or without remainders

**Setup screen additions:**
- "÷" button on Operation card. 'all' picks from {+, −, ×, ÷}.
- "Divide digits" card mirroring multiply: chip multi-select for dividend digits + divisor digits.
- "Allow remainders" toggle (default on).

**Generator:**
- Without remainders: pick divisor d (digit-set), pick quotient q (digit-set), dividend = d × q. Answer = q.
- With remainders: random dividend a (digit-set), divisor b (digit-set), `answer = floor(a/b)`, `remainder = a%b`.

**ArithQuestion:**
- Add `op: 'divide'` and optional `remainder?: number`.

**Render:**
- Horizontal: `672 ÷ 8 =` followed by answer line. Answer key shows `1) 84` or `1) 84 r 3`.
- Long-division column form deferred to a v2 (it's a separate render pattern with the bracket and step-by-step partial-quotients).

**Online play:**
- Without remainders: same single typed input as add/sub/multiply.
- With remainders (online): two-input layout `[ quotient ] r [ remainder ]`. Both must match. (Or skip and only allow remainders in print.)

**Files touched:** `arithmetic/logic.ts`, `pdf.ts`, `printConfig.ts`, `ArithmeticSetup.tsx`, `ArithmeticPlay.tsx`, `storage.ts`, tests.

**Estimated effort:** Small (~1 session). The pattern is the same as multiply; the only new bits are the remainder option and the PDF answer-key formatting.

---

## 2. Time

**Skills:**
- Read analog clock → write digital
- Read digital → ~draw hands~ (online deferred — drawing input is heavy)
- Time arithmetic ("3:45 + 20 minutes = ?")

**Setup screen:**
- **Skill** card (multi-select): `Read clock` / `Time arithmetic` / *(future)* `Match digital ↔ analog`
- **Precision** card (multi-select chips): `hour`, `half-hour`, `quarter`, `5-min`, `1-min`
- **Format** card: `12-hour` / `24-hour` / `both`
- **Difficulty** for time arithmetic: easy (within hour, no roll-over) / medium (across hour) / hard (across midnight)

**Render — analog clock:**
- SVG with face circle, 12 hour numerals, hour hand, minute hand.
- Proportional: minute-hand length ~95% radius, hour-hand ~65%.
- Same `ClockDisplay` component used in screen and worksheet preview; jsPDF re-draws using `doc.circle()` and `doc.line()`.

**Online play:**
- Show analog clock; kid types `H:MM` (one input with auto-formatter, or two inputs `[hour] [minute]`).
- Validate exact hh:mm match (12h: also accept "3:00" vs "03:00").

**PDF:**
- 4-col grid (clocks are square, ~30mm cell width × 35mm height each).
- Each cell: numbered clock + answer line.
- Answer key: `1) 3:45  2) 12:00  ...`

**Files touched:** new `modules/time/` folder, `Hub.tsx` flips "Time" card to enabled.

**Estimated effort:** Medium (~1-2 sessions). Bulk of work is the SVG clock renderer; the rest is standard.

---

## 3. Fractions

**Skills (each independently selectable):**
- `id` — Identify the fraction shaded in a figure
- `eq` — Equivalent fractions (`1/2 = ?/6`)
- `cmp` — Compare fractions (`>` `=` `<`)
- `add-same` — Add fractions, same denominator
- `sub-same` — Subtract fractions, same denominator
- `add-diff` — Add fractions, different denominators (LCM)
- `sub-diff` — Subtract fractions, different denominators
- `mul` — Multiply fractions
- `div` — Divide fractions (multiply by reciprocal)
- `mixed` — Mixed number ↔ improper fraction conversion
- `decimal` — Fraction ↔ decimal conversion (advanced)

**Setup screen:**
- **Skills** card (multi-select chips, one per skill above)
- **Denominators** card (multi-select chips: 2..12)
- **Difficulty** card: easy (small denoms, no simplification) / medium (LCM ≤ 24) / hard (LCM > 24, with simplification)
- **Mixed numbers** toggle: emit mixed-number form when applicable

**FractionQuestion shape:**
```ts
type FractionQuestion =
  | { skill: 'id'; figure: 'circle'|'rect'; total: number; shaded: number; answer: {num:number,den:number} }
  | { skill: 'add-same'; a:{num:number,den:number}; b:{num:number,den:number}; answer:{num:number,den:number} }
  | ...
```

**Render — fraction:**
- Numerator over horizontal rule over denominator (CSS flex-column or SVG).
- For mixed: integer + fraction inline (e.g., `2 ¾`).
- For "identify shaded": SVG circle/rect with shaded sectors/cells.

**Online play:**
- Two input fields: numerator + denominator (or single text `n/d`).
- Compare-skill: 3 buttons `<` `=` `>`.
- Equivalent-fill: one input field for the missing num or den.

**PDF:**
- Each cell renders the fraction notation + answer space (two small underlines for num/den).
- 4-col horizontal layout for compact fractions; column form not needed.
- Answer key: `1) 3/4  2) 1 1/2  3) > ...`

**Files touched:** new `modules/fractions/`. Possible shared `<FractionGlyph>` for screen + PDF.

**Estimated effort:** Medium (~2 sessions). Skill count is high but each skill is small.

---

## 4. Shapes

**Skills:**
- `name-2d` — Name the shape (square, triangle, pentagon, hexagon, octagon, circle)
- `count-sides` — Count sides / vertices
- `name-3d` — Name the solid (cube, cuboid, cylinder, sphere, cone, pyramid)
- `count-faces` — Count faces / edges / vertices on a solid
- `perimeter-rect` — Perimeter of rectangles
- `area-rect` — Area of rectangles
- `area-tri` — Area of triangles
- `area-circle` — Area of circles
- `circumference` — Circumference of circles
- `angle-name` — Identify angles (acute / right / obtuse)
- `angle-measure` — Measure angles given the figure (round to nearest 5°)
- `volume-cube`, `volume-cuboid`

**Setup:**
- **Skills** card (multi-select chips)
- **Difficulty** card: easy (whole-number dimensions, no decimals) / medium (one decimal) / hard (two decimals, mixed units)
- **Units** chip-set (cm, mm, m, in)

**ShapeQuestion render:**
- 2D: SVG polygon with side labels
- 3D: SVG isometric projection with edge labels
- Angle: SVG with arc indicator

**Online play:**
- For naming: 4-button MC.
- For computation: typed answer with units.

**PDF:**
- 3-col grid (shapes need horizontal space for labels). Each cell ~60mm wide.
- Answer key: `1) 24 cm²  2) right  3) hexagon ...`

**Files touched:** new `modules/shapes/`. `<ShapeFigure>` shared SVG component.

**Estimated effort:** Large (~3 sessions). Many sub-skills; SVG drawing per skill type.

---

## 5. Charts

**Skills:**
- `read-bar` — Read a single bar value
- `compare-bar` — Compare two bars (`>`, `<`, difference)
- `total-bar` — Sum across categories
- `read-pie` — Identify the largest / smallest slice
- `pie-fraction` — Express slice as fraction of whole
- `read-line` — Read a single point's value
- `line-trend` — Identify trend (rising / falling / flat)
- `multi-step` — Word problem combining two reads

**Setup:**
- **Chart type** card (multi-select): bar / pie / line / mixed
- **Question kind** card (multi-select): read / compare / total / difference / fraction
- **Data range** card: chip set for max value (10, 50, 100, 1000)

**ChartQuestion render:**
- SVG bar chart with axis labels and bars (4-7 categories typical)
- SVG pie chart with sectors and a legend
- SVG line chart with axis, gridlines, and 5-10 data points

**Online play:**
- MC for trend / pie-largest.
- Typed for value / compare-difference.

**PDF:**
- 2-col grid (charts need real estate). 6-10 questions per page.
- Answer key: `1) 12  2) Mon  3) 1/4 ...`

**Files touched:** new `modules/charts/`. `<BarChart>`, `<PieChart>`, `<LineChart>` SVG components.

**Estimated effort:** Large (~3 sessions). Three distinct chart renderers + question generation per type.

---

## Architectural prep that'll pay off

When we start the second SVG-based module, three pieces become worth extracting:

1. **`<VisualQuestion>` pattern** — every non-text module renders `[visual] [question prompt] [answer input]`. Generalize the layout so each module just plugs its visual.

2. **PDF SVG embedding** — jsPDF can `addImage(svgDataUrl, ...)`, but we've been drawing primitives directly so far. Decide before building: rasterize SVG to PNG and embed, or replicate the figure with `doc.line/circle/path`. The line-primitive approach matches the existing radical-symbol pattern but doesn't scale to chart legends.

3. **Multi-field answer input** — fractions need `[num]/[den]`; time needs `[h]:[m]`; division-with-remainder needs `[q] r [r]`. A small `<MultiFieldInput>` with named slots covers all three.

These three become natural extracts after the second SVG module ships, not before.

---

## Migration / disruption notes

- The Hub's "Coming soon" placeholder card stays in place; each shipped module flips its slot to enabled.
- No existing user data is affected by adding a new module.
- Each module owns its storage namespace, so user progress is independent per module.

## Out of scope for the roadmap

- Authoring tools (custom problem sets, teacher accounts) — separate spec.
- Cross-module mixed practice — interesting but not on the Hub.
- Localization — defer until a school district asks.
