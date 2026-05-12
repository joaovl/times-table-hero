# Changelog

All notable changes to Times Table Hero are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Pie-chart skills (`read-pie`, `pie-fraction`) within the Charts module.
- Shape skills for triangle area, circle area, circumference, and angle naming.
- Fraction skills covering identify, equivalent, compare, and mixed numbers.
- Time arithmetic skill plus a 12-hour / 24-hour format toggle.
- Public release documentation and split production build chunks.

### Changed
- Division questions now support remainders during online play.
- Time and Charts module icons swapped from emoji to monochrome Lucide icons for a cleaner look.

### Fixed
- TypeScript incremental build cache is now correctly ignored by git.

## [0.1.0] - 2026-05-10

First public release.

### Added
- **Hub home page** with six fully self-contained learning modules:
  - **Times Tables** — multiplication and division facts from 0 to 12.
  - **Arithmetic** — addition, subtraction, multiplication, and division with configurable digit counts.
  - **Time** — read analog clocks and convert between 12-hour and 24-hour formats.
  - **Fractions** — recognise, simplify, compare, add, and subtract fractions.
  - **Shapes** — identify 2D and 3D shapes and count faces, edges, and vertices.
  - **Charts** — read and interpret bar, line, and pie charts.
- **Arithmetic practice module**, including a question generator with difficulty buckets, carry/borrow column counters, and discriminated `Question` types.
- **Squares and square roots** as first-class operations, with rendering in the online game and in printed worksheets (PDF sqrt radical with descender tick and dedicated padding).
- **Multi-select chip pickers** for operand digits in add, subtract, and multiply setup forms.
- **Multiply by level** with scaled difficulty, numbered PDFs, and answer keys; level labels are now self-explanatory in the setup form.
- **Operation picker buttons** for square, square root, and "all" on both `GameSetup` and `PrintResources`.
- **Reusable `QuestionDisplay` component** shared across the game, results, and worksheet preview.
- **Round-trip PDF rendering tests** for both modules, plus encoding-safety tests for ASCII glyphs.
- **Active settings summary** inside the print modal so users can see their selection before generating.
- **Page count option** for printing multiple worksheets in one go.
- **Roadmap document** for the four "Coming soon" modules.
- Implementation plans and design specs for the arithmetic module, the modular hub, and squares/square roots.

### Changed
- Restructured `src/` into module folders so each module owns its own setup, play, results, logic, PDF, and storage code.
- Migrated the operation enum value `both` to `all` and extended `recordAnswer` to cover the new operations.
- Multiply level is now driven by two free digit-pickers plus a live example instead of a fixed enum.
- Disambiguated digit and difficulty cards from the multiply card in `all` mode.
- Balanced operation distribution in `all` mode for both modules.
- Compacted the worksheet header by collapsing table ranges.
- Aligned all worksheet operations to a common left edge and matched the radical stroke to the text weight.
- Unified the print flow into a shared modal driven by each module's setup form.
- Capped arithmetic worksheets at 40 questions per page to leave handwriting room, while still allowing up to 80 questions per page for smaller digit sizes.
- Replaced Time and Charts emoji icons with monochrome Lucide icons.
- Simplified game setup defaults and layout, and auto-save user choices in setup pages.
- Worksheet PDFs are now generated with jsPDF instead of relying on the browser's print dialog.
- Increased printable margins to 15 mm to prevent printer clipping.
- Improved UX copy and flow for children using the app independently.

### Fixed
- Stray backslash in the `GameSetup` subtitle.
- Arithmetic PDFs were silently dropping questions past 20, 30, or 40 per page.
- Multiply digit scaling and op-aware per-page caps.
- Blank pages appearing between worksheets when printing on Chromium.
- Worksheet questions wrapping to two lines on print.
- Print margins clipping on some printers.
- ASCII hyphen-minus is now used for the subtract glyph in PDFs to avoid unrenderable characters.

### Removed
- Themed encouragement messages tied to a single user persona, replaced with neutral copy.

[Unreleased]: https://github.com/joaovl/times-table-hero/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/joaovl/times-table-hero/releases/tag/v0.1.0
