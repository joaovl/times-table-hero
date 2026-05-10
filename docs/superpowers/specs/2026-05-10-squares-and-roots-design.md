# Add Squares (²) and Square Roots (√) to Practice and Worksheets

**Date:** 2026-05-10
**Status:** Draft — pending user approval before plan-writing

## Goal

Extend the math practice game and printable worksheet with two new operations:

- **Square** — `n² = ?` (e.g. `7² = 49`)
- **Square root** — `√n = ?` (e.g. `√49 = 7`)

Rename existing "Both" mode to **"All"** and have it mix all four operations (× ÷ ² √) in one session.

## Audience

Primary user: a 10-year-old learning math. Design choices favor:

- Native math symbol notation (²,  √) over ASCII (`^2`, `sqrt`)
- Visual clarity at every size on screen and on printed A4
- Reuse of the existing "Choose Tables" picker so kid sees one consistent number set
- Pedagogical pairing: `n²` and `√(n²)` use the same `n` from selected tables

## Decisions Locked

| Decision | Choice |
|----------|--------|
| Number source for ² and √ | Selected tables only |
| What "All" mixes | All 4 operations (× ÷ ² √) |
| Operation picker layout | 5 buttons in single row |
| Progress tracking | Separate keys per operation |
| Migration of saved `'both'` | Auto-rewrite to `'all'` |
| Question type shape | Discriminated union (binary \| unary) |
| Duplicate `generateQuestions` | Consolidate to `gameLogic.ts` |
| PDF √ glyph | Draw with line primitives (no font embed) |

## Architecture

### Type changes (`src/lib/gameLogic.ts`)

```ts
export type Operation = 'multiply' | 'divide' | 'square' | 'sqrt' | 'all';
export type BinaryOp  = 'multiply' | 'divide';
export type UnaryOp   = 'square' | 'sqrt';

export type Question =
  | { kind: 'binary'; op: BinaryOp; operand1: number; operand2: number; answer: number }
  | { kind: 'unary';  op: UnaryOp;  operand: number;  answer: number };
```

`'all'` is a *setting* value. It never appears on a generated `Question` — the generator emits one of the four concrete ops per question.

### Generator (`src/lib/gameLogic.ts`)

Single source-of-truth `generateQuestions(tables, count, operation)` that the game **and** the worksheet both import. Eliminates the duplicate copy currently in `src/components/Worksheet.tsx`.

Pool composition per op:

| Op | Per table `t` | Yields | Unique facts (12 tables) |
|----|--------------|--------|--------------------------|
| multiply | for `i` in 0..12 | binary `{operand1:t, operand2:i, answer:t*i}` | ~169 |
| divide   | for `i` in 0..12, skip `t=0` | binary `{operand1:t*i, operand2:t, answer:i}` | ~156 |
| square   | once per `t` | unary `{operand:t, answer:t*t}` | 13 |
| sqrt     | once per `t` | unary `{operand:t*t, answer:t}` | 13 |
| all      | union of all four | mixed | ~351 |

Existing reshuffle-on-cycle logic handles "need more questions than unique facts" — relevant for square/sqrt with their tiny pools.

### Render component (`src/components/game/QuestionDisplay.tsx`, new)

Reusable display switching on `q.kind`. Used by both the active question card and the feedback (`= answer`) line, sized via `em` so it adapts to whatever font size the parent applies.

```tsx
export function QuestionDisplay({ q }: { q: Question }) {
  if (q.kind === 'binary') {
    const sym = q.op === 'multiply' ? '×' : '÷';
    return <>{q.operand1} {sym} {q.operand2}</>;
  }
  if (q.op === 'square') {
    return <>{q.operand}<sup className="text-[0.6em] -top-[0.5em]">2</sup></>;
  }
  // sqrt
  return (
    <span className="inline-flex items-baseline">
      <span className="text-[0.85em]">√</span>
      <span className="border-t-[3px] border-current pt-0.5 px-0.5">{q.operand}</span>
    </span>
  );
}
```

### Setup UI (`GameSetup.tsx` + `PrintResources.tsx`)

Operation picker grows from 3 → 5 buttons in a single row (`grid-cols-5`). Symbol-only labels:

```tsx
const OPS = [
  { id: 'multiply', label: '×' },
  { id: 'divide',   label: '÷' },
  { id: 'square',   label: 'x²' },
  { id: 'sqrt',     label: '√' },
  { id: 'all',      label: 'All' },
];
```

At 360px viewport with `min-h-[44px]` and 2px gaps, each button gets ~64px. Current word labels (`× Multiply`) drop because at 5-up they no longer fit; symbol-only is consistent across all five.

Worksheet header `tableSuffix` extends:
- `multiply` → `'×'`
- `divide` → `'÷'`
- `square` → `'²'`
- `sqrt` → `'√'`
- `all` → `'×÷²√'`

### Storage (`src/lib/gameStorage.ts`)

**Settings migration** (transparent on read):

```ts
if (saved.operation === 'both') saved.operation = 'all';
```

Applied in `getSavedSettings` and `getSavedPrintSettings`. Old saved value silently upgrades; kid keeps mixed practice but now with squares/roots included. `DEFAULT_SETTINGS.operation` remains `'multiply'`.

**Progress tracking** — new key scheme:

| Op | Key format | Example |
|----|-----------|---------|
| multiply | `${a}x${b}` (unchanged) | `7x8` |
| divide | `${a}d${b}` (newly distinct) | `56d7` |
| square | `${n}sq` | `7sq` |
| sqrt | `${radicand}rt` | `49rt` |

Currently `recordAnswer` is called for divide questions with `(operand1, operand2)` → key `56x7`. After this change, divide records will go to `56d7`. Old `Nxx` keys remain in localStorage but are harmless (no longer written; reads tolerate them).

`QuestionRecord` adds optional fields:

```ts
export interface QuestionRecord {
  multiplier: number;        // legacy field, kept
  multiplicand: number;      // legacy field, kept
  op?: BinaryOp | UnaryOp;   // new, optional
  timesWrong: number;
  timesCorrect: number;
  lastAttempt: string;
}
```

`recordAnswer` signature changes to take a `Question` (the type carries everything needed) and write the appropriate key.

### PDF rendering (`src/lib/worksheetPdf.ts`)

`PdfQuestion` shape mirrors `Question` (discriminated union). `drawPage` switches on kind:

- **binary** — existing code path, unchanged
- **square** — `doc.text(operand)` then `doc.setFontSize(fs * 0.6)` and `doc.text('2', x + width(operand), y - fs*0.3)`
- **sqrt** — radical drawn with two `doc.line()` calls (diagonal hook + overbar across radicand width), then `doc.text(operand)` placed under the overbar

No font embedding. The `√` character is never sent to jsPDF (it's not in WinAnsi); the radical is geometric primitives only. Scales correctly at every layout font size.

HTML preview in `Worksheet.tsx` uses `<sup>` and a CSS `border-top` overline — browsers render √ natively, so no line-drawing needed there.

### GameResults shape (`GamePlay.tsx`)

`incorrectQuestions` array currently holds `{operand1, operand2, operation, userAnswer, correctAnswer}` for binary. Extends to a discriminated union mirroring `Question`. `GameResults` consumers (results screen) updated to render via `QuestionDisplay`.

## Data Flow

```
GameSetup / PrintResources
       │   (Operation: 'multiply'|'divide'|'square'|'sqrt'|'all')
       ▼
generateQuestions(tables, count, operation)   ← single source in gameLogic.ts
       │   (Question[] — discriminated union)
       ▼
GamePlay  ──► QuestionDisplay ──► <Card>
       │                          
       ▼
recordAnswer(question, correct, userId)
       │   (key: 7x8 | 56d7 | 7sq | 49rt)
       ▼
localStorage progress

Worksheet ──► generateWorksheetPdf({ pages: Question[][] })
                    │
                    ▼
              drawPage switches on kind, draws ²/√ via primitives
```

## Wrong-Answer Generation

`generateWrongAnswers(correctAnswer, difficulty)` is already op-agnostic — it operates on a number. No change needed. Verified ranges remain plausible:

- `12² = 144`, easy ±5..20 → 124..164: fine
- `√1 = 1`, easy ±5..20 → forces non-negative branch already handles this
- All other answers in 0..144 range, well within current logic

## Testing

**Unit (Vitest):**
- `generateQuestions` returns correct `kind` per `op` setting
- `generateQuestions` honors `count` and shuffles
- `'all'` setting yields questions of all 4 op kinds across enough samples
- `getQuestionKey(question)` round-trip for each of the 4 shapes
- Settings migration: input `{operation:'both', ...}` returns `{operation:'all', ...}`

**Manual smoke (dev server + print preview):**
- Each of 5 op picks, each of 3 difficulties, both game modes
- Visual check `7²` superscript and `√49` overline on game card and feedback
- PDF download per op; verify `²` and `√` render cleanly at small font sizes (100-question grid)
- localStorage seeded with `operation:'both'` → next launch loads as 'all'

## Out of Scope (v1)

- Linking square ⇄ sqrt streaks (separate keys per choice)
- Cube and cube root
- Non-perfect-square radicands (irrationals)
- Pedagogical hint on wrong sqrt ("7 × 7 = 49") — could ship as v2 if useful

## Files Touched

- `src/lib/gameLogic.ts` — types, consolidated generator, wrong-answer (no change), messages (no change)
- `src/lib/gameStorage.ts` — migration, key scheme, signature changes
- `src/lib/worksheetPdf.ts` — discriminated union, draw switch, radical primitives
- `src/components/game/GameSetup.tsx` — 5-button op picker
- `src/components/game/GamePlay.tsx` — `QuestionDisplay`, `recordAnswer` call site
- `src/components/game/GameResults.tsx` — discriminated `incorrectQuestions` render
- `src/components/game/QuestionDisplay.tsx` — **new**
- `src/pages/PrintResources.tsx` — 5-button op picker
- `src/components/Worksheet.tsx` — drop duplicate generator, use `QuestionDisplay` in HTML preview, extended `tableSuffix`
- Tests covering above
