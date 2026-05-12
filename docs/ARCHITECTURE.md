# Architecture

This page is for contributors who want to add a new module or change an existing one. After reading it you should be able to design a new module without needing to open more than one or two existing modules for reference. Everything else is detail.

## The big picture

Times Table Hero is a single-page React app built with Vite. There is no backend. Every module under `src/modules/<name>/` is self-contained: it owns its question generator, its setup screen, its play screen, its results screen, its PDF generator, its print configuration, and its localStorage adapter. Modules do not import from each other.

The Hub at `src/pages/Hub.tsx` is the menu. The router in `src/App.tsx` wires each module to two routes: one for online play and one for the printable-worksheet dialog.

```
                    src/App.tsx (Routes)
                            |
                            v
                    src/pages/Hub.tsx
                       /  |  |  |  |  \
                      /   |  |  |  |   \
                     v    v  v  v  v    v
            +------------+  +------------+   ... 12 modules total
            | times-tab. |  | arithmetic |
            |  Index     |  |  Index     |
            +-----+------+  +-----+------+
                  |               |
        +---------+---------+     |
        |         |         |     |
        v         v         v     v
      Setup --> Play --> Results  (Print modal openable from Setup)
        |                          |
        +----------- logic.ts -----+        <- generators, types, CURRICULUM_TAGS
        |           pdf.ts                  <- jsPDF worksheet renderer
        |           storage.ts              <- localStorage namespace
        |           printConfig.ts          <- per-page sizing helpers
        +------- co-located tests ----------+
```

## Folder shape

Every module under `src/modules/<name>/` follows the same layout:

```
src/modules/<name>/
  <Name>Index.tsx        # Default export. Renders Setup -> Play -> Results.
  <Name>Setup.tsx        # Skill / difficulty / question-count picker + Print button.
  <Name>Play.tsx         # Answer flow.
  <Name>Results.tsx      # Summary, missed-questions list, retry.
  logic.ts               # Pure generator + checker + CURRICULUM_TAGS export.
  pdf.ts                 # jsPDF renderer for the printable worksheet.
  storage.ts             # localStorage read/write under the module's namespace.
  printConfig.ts         # Per-page sizing helpers (rows, cols, font sizes).
  logic.test.ts          # Generator and checker tests.
  pdf.test.ts            # PDF round-trip tests with vi.mock('jspdf').
  printConfig.test.ts    # printConfig math tests.
  <feature>.tsx          # Optional sub-components, e.g. ClockDisplay.
```

`src/modules/arithmetic/` is the cleanest minimal reference. `src/modules/shapes/` is the cleanest reference for a module that renders SVG figures in play and primitive shapes via jsPDF.

## The Index component

Each module exports a default React component named `<Name>Index`. It takes one optional prop:

```ts
interface ModuleIndexProps {
  printOpen?: boolean;
}
```

When `printOpen` is true the Setup screen mounts with the print dialog already open. This is how the route `/arithmetic/print` differs from `/arithmetic`. The router in `src/App.tsx` passes this prop:

```tsx
<Route path="/arithmetic" element={<ArithmeticIndex />} />
<Route path="/arithmetic/print" element={<ArithmeticIndex printOpen />} />
```

Inside `<Name>Index.tsx` you typically run a local state machine: `'setup' | 'play' | 'results'`. Setup transitions to Play when the kid clicks Start. Play transitions to Results when the question list is exhausted or the timer ends. Results transitions back to Setup on retry.

## State flow

```
   +-------+   start   +------+   finish   +---------+
   | Setup | --------> | Play | ---------> | Results |
   +-------+           +------+            +---------+
       ^                                       |
       |                retry                  |
       +---------------------------------------+

       Print modal opens from Setup (does not transition to Play).
```

The Print modal is a child of Setup. Opening it does not change the screen — the user picks a page count, an answer-key toggle, and either downloads the PDF or cancels.

## localStorage namespacing

Each module owns three keys, all prefixed with the module slug:

```
<slug>-settings          # the chosen practice settings
<slug>-printSettings     # the chosen print settings (pages, layout)
<slug>-sessions          # an array of recent session results
```

For example, the Arithmetic module uses `arithmetic-settings`, `arithmetic-printSettings`, and `arithmetic-sessions`. There is also a per-profile suffix: `arithmetic-settings-<userId>` when a kid profile is active. See `src/modules/arithmetic/storage.ts` for the canonical pattern, including legacy-shape migration on load.

A new module should never read from another module's keys. If you need shared state, put it in `src/lib/`.

## Wiring a new module into the Hub

Three places need to know about a new module:

1. **A card on the Hub.** Add a `<Card>` in `src/pages/Hub.tsx` that calls `navigate('/<slug>')` on click.
2. **Two routes in the router.** Add `<Route path="/<slug>" element={<NameIndex />} />` and `<Route path="/<slug>/print" element={<NameIndex printOpen />} />` to `src/App.tsx`.
3. **The lazy-import / direct-import at the top of `App.tsx`.** Bring in the default export from the new module.

Nothing else outside `src/modules/<name>/` should be touched.

## Reusable patterns

You almost certainly do not need to invent new UI patterns. The repository contains good references for most things you will want.

### Chip multi-select (pick a subset of skills, tables, or operands)

Pattern lives in `src/modules/arithmetic/ArithmeticSetup.tsx`. The same shape — a row of toggleable chips, with a "select all / clear all" affordance — is used in Times Tables, Shapes, Charts, and most of the new modules. Keep the chips short (1-3 words) so they fit on a phone-width screen.

### SVG figure in play, primitive draw in PDF

When a module needs to render a shape (a clock face, a polygon, a bar chart, a pie chart, a figure for perimeter), the convention is:

- **Online play** renders the figure as an inline SVG React component. Examples: `src/modules/time/ClockDisplay.tsx`, `src/modules/shapes/ShapeFigure.tsx`, `src/modules/fractions/FractionDisplay.tsx`, `src/modules/charts/BarChart.tsx`, `src/modules/charts/PieChart.tsx`.
- **PDF output** uses jsPDF primitives (`line`, `rect`, `circle`, `triangle`) to draw the same figure in vector form on the worksheet. The primitive draws live in the module's `pdf.ts`.

Do not try to rasterise SVG to a PNG and embed it. The PDFs need to print cleanly at A4 and primitives stay sharp; rasterised SVG ends up with fuzzy edges or compresses badly.

### Generator returns a discriminated union

When a module covers multiple skill shapes (e.g. read-clock vs time-arithmetic, or read-bar vs read-pie), the `Question` type is a discriminated union keyed on a `skill` field. Renderers `switch` on that field and TypeScript will fail the build if a case is missing. See `src/modules/time/logic.ts` or `src/modules/decimals/logic.ts` for a clean example.

## Encoding-safety rule for PDFs

jsPDF ships with Helvetica using the **WinAnsi** encoding. WinAnsi covers Latin-1 plus a handful of curated Windows-1252 extras. Anything outside that range renders as garbage (typically a stray quote mark, a question mark, or a blank box).

### Safe to put in `doc.text()`

- Plain ASCII (U+0020 to U+007E).
- Latin-1 supplement (U+00A0 to U+00FF). This gives you the common European accents and these maths-friendly extras:
  - `+` plus, ASCII hyphen-minus `-` (U+002D), `×` (U+00D7), `÷` (U+00F7).
  - `²` (U+00B2), `³` (U+00B3) for squared / cubed.
  - `£` (U+00A3) for pounds, `°` (U+00B0) for degrees.
- A small set of common Windows-1252 extras above U+00FF such as `–` (en-dash U+2013) and `…` (ellipsis U+2026). Test before relying on these.

### Unsafe — will mis-render

- Anything in the **Mathematical Operators block, U+2200 to U+22FF.** That means no `∀`, no `∃`, no `∈`, no `≈`, no `≠`, no `≤`, no `≥`, no `≡`, no `√`, no `∞`, no `∫`. Use plain words ("approximately", "less than", "square root of", "infinity") or draw a primitive yourself.
- **U+2212 mathematical minus.** Use ASCII hyphen-minus (`-`, U+002D) instead. This is the single most common bug — the rendered output is a smart quote where the minus should be.
- Emoji. The app excludes them from the source by convention; they would render as boxes in the PDF anyway.
- CJK, Cyrillic, Arabic, Greek (other than what is in Latin Extended). If a future module needs these, it needs to embed a Unicode-aware font first.

### How to verify

Every module's `pdf.test.ts` mocks jsPDF and captures every string that the module passes to `doc.text()`. The capture array is then asserted against a regex that matches anything in the U+2200 to U+22FF block:

```ts
const MATH_OPERATORS_BLOCK = /[∀-⋿]/u;
expect(capturedTextCalls.some(t => MATH_OPERATORS_BLOCK.test(t))).toBe(false);
```

See `src/modules/arithmetic/pdf.test.ts` for the canonical fake-jsPDF setup. Copy it into a new module's `pdf.test.ts` and add the encoding-safety assertion.

## Testing approach

Two layers of tests cover every module:

### Logic-level unit tests (`logic.test.ts`)

Test the generator and the answer checker as pure functions. The generator is randomised, so loop tests run the generator many times (typically 50 to 200) and assert invariants:

- Every returned question matches the requested skill set.
- The answer is always within the expected numeric range.
- For two-step word problems, the workings string is consistent with the answer.
- The answer checker accepts every legal form (e.g. `£3.50`, `3.50`, `350p`) and rejects malformed input.

Use seeded randomness when you need reproducibility, but most generator tests just rely on the law of large numbers: if any bad question can be generated, looping enough times will produce one.

### PDF round-trip tests (`pdf.test.ts`)

Mock `jspdf` with `vi.mock('jspdf', () => ...)`. The fake `JsPDF` class records every call to `doc.text(...)` in a top-level array (declared with `vi.hoisted` so the mock and the test share it). Then:

- Generate a worksheet from a known question list.
- Assert the captured strings contain the expected question text in the expected order.
- Assert the captured strings do not contain any Mathematical Operators block character.
- Assert the answer key (when enabled) appears on the last page and matches the question list.

`src/modules/arithmetic/pdf.test.ts` is the canonical template. Copy it and adapt the question generator import.

### `printConfig.test.ts`

Where present, this file tests the sizing math (questions per page given a paper size, font size, and minimum cell padding). It is pure arithmetic — no React, no jsPDF.

## Curriculum tagging

Each module's `logic.ts` exports a `CURRICULUM_TAGS` constant mapping every skill key to one or more UK National Curriculum year groups and a short objective string. The shape varies slightly across modules (some use `Record<Skill, string[]>`, others use `Record<Skill, { year: ...; objective: ... }>`); both are accepted.

When you add or rename a skill, add or rename its entry in `CURRICULUM_TAGS` in the same commit, and update `docs/curriculum/uk-ks2.md` so the public mapping stays accurate.

## Anti-checklist

Things to avoid when adding a module:

- **Don't import across modules.** If you find yourself reaching into `src/modules/<other>/logic.ts`, lift the shared bit into `src/lib/`.
- **Don't add a third-party analytics or telemetry library.** See `PRIVACY.md` — the app deliberately collects nothing.
- **Don't embed images via `<img src="data:...">` in PDFs.** Use jsPDF vector primitives.
- **Don't store anything in `localStorage` under a key that doesn't start with your module slug.**
- **Don't add new top-level routes for module sub-screens.** The Index component owns its own state machine; only two routes per module exist.
- **Don't use emojis or non-WinAnsi glyphs in PDF output.** Same applies to UI strings by convention.

## Where to go next

- `CONTRIBUTING.md` — code style, test command, PR conventions.
- `docs/curriculum/uk-ks2.md` — the full per-year objective mapping.
- `docs/superpowers/specs/2026-05-10-future-modules-roadmap.md` — the shared module spec and the long-form description of each module that pre-dates them.
- `PRIVACY.md` — what the app does and does not collect, and why that shapes some of the choices above.
