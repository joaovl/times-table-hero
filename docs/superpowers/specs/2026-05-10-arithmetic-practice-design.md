# Arithmetic Practice Module + Modular Hub

**Date:** 2026-05-10
**Status:** Draft — pending user approval before plan-writing

## Goal

Add a second practice domain to the app: **multi-digit arithmetic** (addition, subtraction, multiplication) for both online practice and printable worksheets. Restructure the home screen into a **modular Hub** so future curriculum modules (charts, time-reading, shapes, fractions, ...) drop in alongside the existing times-tables module without rework.

## Audience

Same primary user as the rest of the app — a 10-year-old learning math. The new domain covers grade-school arithmetic that goes beyond the 12×12 times tables: column addition / subtraction with regrouping, and multi-digit multiplication.

## Decisions Locked

| Decision | Choice |
|----------|--------|
| Modular structure | Approach C — sibling self-contained modules; extract shared bits only after a third module ships |
| Home screen | New Hub page; module cards (Times Tables, Arithmetic, Coming Soon) |
| Difficulty meaning | Math complexity — carry/borrow count for +/−; partial-product complexity for × |
| Digit count UX | Two explicit rows: "Exactly N" vs "Up to N" (1–5) |
| Multiplication digit cap | `min(setting, 3)` — `2×2`, `1×3`, `2×3` are the largest hard problems |
| Online answer input | Always typed (no multiple choice for multi-digit) |
| Operation set v1 | `+`, `−`, `×`, `All` — division left for v2 |
| Per-problem progress tracking | Skipped for arithmetic (problem space too large); session-level stats only |

## Architecture

### Folder structure

```
src/
  pages/
    Hub.tsx                         NEW
    NotFound.tsx                    unchanged
  modules/
    times-tables/                   NEW folder; existing code moves here
      TimesTablesIndex.tsx          ← was pages/Index.tsx
      TimesTablesSetup.tsx          ← was components/game/GameSetup.tsx
      TimesTablesPlay.tsx           ← was components/game/GamePlay.tsx
      TimesTablesResults.tsx        ← was components/game/GameResults.tsx
      TimesTablesPrint.tsx          ← was pages/PrintResources.tsx
      TimesTablesWorksheet.tsx      ← was components/Worksheet.tsx
      logic.ts                      ← was lib/gameLogic.ts
      pdf.ts                        ← was lib/worksheetPdf.ts
      storage.ts                    ← was lib/gameStorage.ts
    arithmetic/                     NEW
      ArithmeticIndex.tsx
      ArithmeticSetup.tsx
      ArithmeticPlay.tsx
      ArithmeticResults.tsx
      ArithmeticPrint.tsx
      ArithmeticWorksheet.tsx
      logic.ts
      pdf.ts
      storage.ts
  components/
    game/QuestionDisplay.tsx        stays (still consumed by times-tables)
    ui/                             unchanged
    UserSelector.tsx, NewUserModal  unchanged
  lib/
    typography.ts, themeStorage.ts, userStorage.ts, utils.ts   unchanged
```

`gameStorage.ts` splits: the times-tables-specific functions (`recordAnswer`, `getProgress`, `getSavedSettings`, `getSavedPrintSettings`, `saveSession`, `getSessions`, `getTotalStats`) move into `modules/times-tables/storage.ts`. User storage and theme storage stay shared.

### Routing

```tsx
<Routes>
  <Route path="/" element={<Hub />} />
  <Route path="/times-tables" element={<TimesTablesIndex />} />
  <Route path="/times-tables/print" element={<TimesTablesPrint />} />
  <Route path="/arithmetic" element={<ArithmeticIndex />} />
  <Route path="/arithmetic/print" element={<ArithmeticPrint />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

Existing `/print` route disappears; the menu item inside times-tables setup now navigates to `/times-tables/print` (path string update only — same component).

### Hub page

A landing page with module cards (2-column on desktop, 1-column on mobile). Top chrome — Menu (theme picker, version) + UserSelector — is rendered in the Hub and replicated minimally inside each module's setup page (back-to-Hub button + UserSelector).

Each module card: visual preview block, module name, one-line capability summary, click → route to module root.

```
[ ✕ Times Tables ]   [ + Arithmetic ]
  ×  ÷  x²  √          +  −  ×
  Tables 1–12          1–5 digits

[ Coming Soon ]   ← greyed; lists planned module names
```

### Arithmetic types (`src/modules/arithmetic/logic.ts`)

```ts
export type ArithOp = 'add' | 'subtract' | 'multiply' | 'all';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DigitMode =
  | { kind: 'exact'; digits: number }   // both operands have exactly `digits` digits
  | { kind: 'upTo'; digits: number };   // each operand independently 1..`digits`

export interface ArithQuestion {
  op: 'add' | 'subtract' | 'multiply';  // never 'all' on a question
  operand1: number;
  operand2: number;
  answer: number;
}

export interface ArithSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}
```

### Difficulty rules

| Op | Easy | Medium | Hard |
|----|------|--------|------|
| `add` | 0 carries across columns | exactly 1 carry | ≥ 2 carries |
| `subtract` | 0 borrows; result ≥ 0 | exactly 1 borrow; result ≥ 0 | ≥ 2 borrows; result ≥ 0 |
| `multiply` | 1 × 1 digit, capped at the digit setting | 1 × 2 digit (or 2 × 1) | 2 × 2 digit, or 2 × 3 / 1 × 3 (capped at `min(setting, 3)`) |

`subtract` always swaps operands so `operand1 ≥ operand2` — kids never see negatives. Carry-/borrow-counters are implemented as simple per-column scans:

```ts
function countCarries(a: number, b: number): number {
  let carries = 0, carry = 0;
  while (a > 0 || b > 0 || carry > 0) {
    const sum = (a % 10) + (b % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry) carries++;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return carries;
}

function countBorrows(a: number, b: number): number {
  let borrows = 0;
  let av = a, bv = b;
  while (av > 0 || bv > 0) {
    const ad = av % 10, bd = bv % 10;
    if (ad < bd) {
      borrows++;
      av = Math.floor(av / 10) - 1;
    } else {
      av = Math.floor(av / 10);
    }
    bv = Math.floor(bv / 10);
  }
  return borrows;
}
```

### Generator (`generateArithQuestions`)

Reject-and-retry. For each requested question:

1. Pick concrete op (if `operation === 'all'`, choose uniformly from `add | subtract | multiply`).
2. Pick operand digit counts based on `DigitMode` and op-specific cap (multiplication uses `min(digits, 3)` and op-specific digit pairs by difficulty).
3. Sample `operand1`, `operand2` uniformly within their digit ranges.
4. For subtract, ensure `operand1 ≥ operand2` (swap if needed).
5. Check the difficulty predicate (`countCarries` / `countBorrows` / multiplication-bucket rules).
6. Accept if predicate matches the requested bucket; else retry up to N=200 times.
7. If no match after N retries, accept the closest match (prevents infinite loop on impossible combos like "easy multiply with 5-digit exact").

Pure function. Easy to unit-test bucket-by-bucket.

### Arithmetic setup screen (`ArithmeticSetup.tsx`)

Reuses the styling of `TimesTablesSetup.tsx` (gradient buttons, card layout, typography). Sections:

- **Operation** — 4-button row: `+`, `−`, `×`, `All`
- **Digits — Exactly** — 5-button row: 1, 2, 3, 4, 5
- **Digits — Up to** — 5-button row: 1, 2, 3, 4, 5
- **Difficulty** — 3-button row with op-aware subtitles ("No carry / 1 carry / multiple" for `+`)
- **Game mode** — Questions / Timed (existing pattern)
- **Print Worksheet** — secondary button → `/arithmetic/print`
- **Let's Go!** — primary button → starts game

Selecting a button in "Exactly" deselects "Up to" and vice versa (mutually exclusive).

Auto-saves to `arithmetic-settings-${userId}` on change (mirrors current behavior).

### Arithmetic play screen (`ArithmeticPlay.tsx`)

- Header chrome (back/score/timer/progress) identical to times-tables.
- Question card renders the equation in **column form** (stacked, right-aligned, op symbol left of bottom row, horizontal rule):
  ```
       234
     + 567
     ─────
  ```
- Single number input + Check button. Enter key submits.
- Feedback: correct → green flash + positive message → next (800 ms). Wrong → red shake + show answer on the bottom row for 1.4 s → next.
- Streak badge after 3-in-a-row (reuses pattern).

`recordAnswer` is **not** called per-problem (no progress dictionary). Instead, on game-complete, `saveArithSession` writes one record to `arithmetic-sessions-${userId}`:

```ts
{
  date: ISO string,
  score: number,
  total: number,
  op: ArithOp,           // setting, not per-question op
  digitMode: DigitMode,
  difficulty: Difficulty,
}
```

### Arithmetic results screen (`ArithmeticResults.tsx`)

Same shape as times-tables results: stars, score, percentage message, list of incorrect questions (rendered as horizontal `234 + 567 = 801` strings — column form is reserved for the active question card and the worksheet). Buttons: Play Again, Change Settings.

No "Improvements" / "Still Challenging" sections — those depend on the per-problem progress dictionary, which arithmetic does not track.

### Arithmetic worksheet + PDF (`ArithmeticWorksheet.tsx` + `pdf.ts`)

Layout adapts to digit width:

| Effective max digits | Cols | Rows | Cap per page |
|----------------------|------|------|--------------|
| ≤ 2 | 4 | 10 | 40 |
| 3 | 3 | 10 | 30 |
| 4–5 | 2 | 10 | 20 |

(Effective max = digit setting, capped at 3 for multiplication.)

Per-cell rendering:
- ≤ 3 digits → horizontal: `234 + 567 = ___`
- ≥ 4 digits → column form (stacked, right-aligned).

Helvetica covers `+`, `−`, `×`. No font work needed.

Page count picker: 1, 3, 5, 10, 20 (same as times-tables print).

### Storage (per-module, namespaced)

| Key | Shape | Owner |
|-----|-------|-------|
| `maths-challenge-*` | existing times-tables data | `modules/times-tables/storage.ts` |
| `arithmetic-settings-${userId?}` | `ArithSettings` | `modules/arithmetic/storage.ts` |
| `arithmetic-printSettings-${userId?}` | print page settings | `modules/arithmetic/storage.ts` |
| `arithmetic-sessions-${userId?}` | session list (last 50) | `modules/arithmetic/storage.ts` |

User and theme storage (`userStorage.ts`, `themeStorage.ts`) stay shared at the top level.

## Data Flow

```
Hub (/)
   │
   ├─ click Times Tables card  → /times-tables → TimesTablesIndex (setup → play → results)
   │                                            └─ menu → /times-tables/print
   │
   └─ click Arithmetic card    → /arithmetic   → ArithmeticIndex (setup → play → results)
                                                └─ Print Worksheet button → /arithmetic/print

ArithmeticSetup
   ↓ ArithSettings
generateArithQuestions(settings)
   ↓ ArithQuestion[]
ArithmeticPlay  →  saveArithSession on complete
   ↓ ArithResults
ArithmeticResults

ArithmeticPrint
   ↓ generateArithQuestions × pageCount
generateArithPdf({ pages, settingsLabel, studentName })
```

## Testing

**Unit (Vitest):**
- `countCarries` against `123+456=0`, `19+1=1`, `99+1=2`, `999+1=3`.
- `countBorrows` against `45-23=0`, `30-12=1`, `300-12=2`, `1000-1=3`.
- `generateArithQuestions` for every (op, difficulty, digitMode) combo: every emitted question satisfies the bucket predicate.
- `subtract` never emits negative answer.
- `multiply` respects `min(digits, 3)` cap.
- `'all'` mixes `add`, `subtract`, `multiply` over enough samples.
- Digit constraint: `exact` → both operands have that digit count; `upTo` → each operand independently within range.

**Manual smoke:**
- Hub renders both module cards on desktop and mobile.
- Each times-tables flow still works after the file move (regression).
- Arithmetic setup → play → results → play again → change settings.
- Each (op × difficulty × digit) combination generates plausible questions.
- Worksheet preview + PDF for each digit bucket (1–2, 3, 4–5).
- Migration: any old `localStorage` for `maths-challenge-*` keeps working.

## Future-Module Compatibility

The structure cleanly accommodates planned domains:

- **Charts** — `modules/charts/` with own `ChartsSetup` (chart types), `ChartsPlay` (renders SVG chart, multiple-choice question), `ChartsPrint` (PDF with embedded chart images).
- **Time** — `modules/time/` with analog-clock SVG renderer.
- **Shapes** — `modules/shapes/` for geometry recognition / area-perimeter / angles.
- **Fractions** — `modules/fractions/`.

Each new module:
1. Adds a folder under `src/modules/`.
2. Adds a card to the Hub's module list.
3. Adds two routes (`/<module>` and `/<module>/print` if applicable).

After the third module ships, common chrome (back-to-Hub bar + UserSelector) gets extracted into a shared `<ModuleHeader>` component — not before, to avoid premature abstraction.

## Out of Scope (v1)

- Division in arithmetic (long division has its own pedagogy; revisit when the rest stabilizes).
- Per-problem progress tracking for arithmetic.
- Module enable/disable settings (every module always visible).
- Localization of difficulty labels.
- Mixed times-tables-and-arithmetic sessions.

## Files Touched

**New:**
- `src/pages/Hub.tsx`
- `src/modules/arithmetic/ArithmeticIndex.tsx`
- `src/modules/arithmetic/ArithmeticSetup.tsx`
- `src/modules/arithmetic/ArithmeticPlay.tsx`
- `src/modules/arithmetic/ArithmeticResults.tsx`
- `src/modules/arithmetic/ArithmeticPrint.tsx`
- `src/modules/arithmetic/ArithmeticWorksheet.tsx`
- `src/modules/arithmetic/logic.ts`
- `src/modules/arithmetic/pdf.ts`
- `src/modules/arithmetic/storage.ts`
- `src/modules/arithmetic/logic.test.ts`

**Moved (renamed):**
- `src/pages/Index.tsx` → `src/modules/times-tables/TimesTablesIndex.tsx`
- `src/components/game/GameSetup.tsx` → `src/modules/times-tables/TimesTablesSetup.tsx`
- `src/components/game/GamePlay.tsx` → `src/modules/times-tables/TimesTablesPlay.tsx`
- `src/components/game/GameResults.tsx` → `src/modules/times-tables/TimesTablesResults.tsx`
- `src/pages/PrintResources.tsx` → `src/modules/times-tables/TimesTablesPrint.tsx`
- `src/components/Worksheet.tsx` → `src/modules/times-tables/TimesTablesWorksheet.tsx`
- `src/lib/gameLogic.ts` → `src/modules/times-tables/logic.ts`
- `src/lib/worksheetPdf.ts` → `src/modules/times-tables/pdf.ts`
- `src/lib/gameStorage.ts` → `src/modules/times-tables/storage.ts`
- `src/lib/gameLogic.test.ts` → `src/modules/times-tables/logic.test.ts`
- `src/lib/gameStorage.test.ts` → `src/modules/times-tables/storage.test.ts`

**Modified:**
- `src/App.tsx` — new routes
- `src/components/game/QuestionDisplay.tsx` — keep; only times-tables consumes it for now
