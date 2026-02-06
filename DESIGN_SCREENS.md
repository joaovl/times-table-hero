# Times Table Hero - Screen Design Document

## Application Flow & Screens

This document lists all screens in the application with their font sizes and layout details.

---

## 1. HOME / MAIN MENU
**File:** `src/pages/Index.tsx`
**Route:** `/`

**Description:** Landing page with main menu options

**Layout:**
- App title/logo
- "Play Game" button → goes to Game Setup
- "Print Worksheets" button → goes to Print Resources

**Font Sizes:**
- Title: (check Index.tsx for exact sizes)
- Buttons: Standard button sizes

---

## 2. GAME SETUP SCREEN
**File:** `src/components/game/GameSetup.tsx`
**Route:** `/` (embedded in Index page)

**Description:** Configure game settings before playing

**Layout:**
- Header:
  - Title: "Times Table Hero"
  - Subtitle: "Hi {name}! Pick your tables and let's practise!"
  - Stats: "{X} games, {Y} correct!"
  - Menu dropdown (theme selector) - LEFT side
  - User selector - RIGHT side
- Cards:
  - "Choose Your Tables" (0-12 grid)
  - "Pick Difficulty" (Easy/Medium/Hard)
  - "Game Mode" (Questions/Time)
  - "Questions" or "Time Limit"
- "Let's Go!" button
- Version: v0.1.0-{hash}

**Font Sizes (SHARED with Print Resources):**
- Title: `text-[28px] md:text-[40px]` (mobile: 28px, desktop: 40px)
- Subtitle: `text-[13px] md:text-[16px]` (mobile: 13px, desktop: 16px)
- Card headings: `text-[14px] md:text-[20px]` (mobile: 14px, desktop: 20px)
- Table numbers: `text-base md:text-xl` (16px/20px)
- Small buttons: `text-xs md:text-sm` (12px/14px)
- Version: `text-[10px]`

**Typography Config:** `typography.setup.*` in `src/lib/typography.ts`
**Helper:** `getSetupClasses()` returns all setup screen classes

**Typography Baseline:** This is the MAIN AREA baseline for the app

---

## 3. GAME PLAY SCREEN
**File:** `src/components/game/GamePlay.tsx`

**Description:** Active gameplay - answer questions

**Layout:**
- Header bar:
  - "← Quit" button (left)
  - Score counter (center): "{X} correct"
  - Progress (right): "{current} / {total}" or timer
- Question card:
  - Large question: "X × Y" or "X ÷ Y"
  - Equals: "= ?"
- Answer area:
  - Hard mode: Text input
  - Easy/Medium: 3 option buttons
- Submit/Next button

**Font Sizes (BASELINE - Main Game Area):**
- **Question numbers:** `text-5xl md:text-6xl lg:text-7xl` (48px/60px/72px) ⭐ PRIMARY BASELINE
- **Equals sign:** `text-2xl md:text-3xl` (24px/30px)
- **Answer reveal:** `text-3xl md:text-4xl` (30px/36px)
- **Input field:** `text-2xl md:text-4xl` (24px/36px)
- **Option buttons:** `text-2xl md:text-3xl` (24px/30px)
- **Score display:** `text-xl md:text-2xl` (20px/24px)
- **Progress/Timer:** `text-sm md:text-base` or `text-lg md:text-xl`

**Typography Config Reference:** `src/lib/typography.ts` - `typography.game.*`

---

## 4. GAME RESULTS SCREEN
**File:** `src/components/game/GameResults.tsx`

**Description:** Shows score and incorrect answers after game

**Layout:**
- Score summary
- Incorrect questions review (if any)
- "Play Again" button
- "Back to Menu" button

**Font Sizes:**
- Title/Score: Large text
- Review questions: Medium text
- Buttons: Standard button sizes

---

## 5. PRINT RESOURCES SETUP
**File:** `src/pages/PrintResources.tsx`
**Route:** `/print-resources`

**Description:** Configure worksheet settings before generating

**Layout:**
- Header:
  - "← Menu" button (LEFT)
  - Title: "Print Worksheets" (CENTER)
  - User selector (RIGHT)
  - Subtitle: "Create printable practice sheets"
- Cards:
  - "Choose Tables" (0-12 grid with All/Clear buttons)
  - "Operation" (Multiply/Divide/Both)
  - "Number of Questions" (20/40/60/80/100)
- "Generate Worksheet" button

**Font Sizes (SHARED with Game Setup):**
- Title: `text-[28px] md:text-[40px]` (mobile: 28px, desktop: 40px)
- Subtitle: `text-[13px] md:text-[16px]` (mobile: 13px, desktop: 16px)
- Card headings: `text-[14px] md:text-[20px]` (mobile: 14px, desktop: 20px)
- Table numbers: `text-base md:text-xl` (16px/20px)
- Small buttons: `text-xs md:text-sm` (12px/14px)

**Typography Config:** `typography.setup.*` in `src/lib/typography.ts`
**Helper:** `getSetupClasses()` returns all setup screen classes

⚠️ **IMPORTANT:** Font sizes are IDENTICAL to Game Setup (#2). Changes to one affect both.

---

## 6. WORKSHEET PREVIEW (Screen View)
**File:** `src/components/Worksheet.tsx`
**State:** `showWorksheet={false}` (preview mode)

**Description:** Screen preview of worksheet before printing - THIS IS WHAT YOU SEE BEFORE CLICKING PRINT

**Layout:**
- Control bar (top):
  - "← Back" button
  - Info: "{X} questions • {Y} rows × 5 cols • Font: {size}"
  - "Print Worksheet" button
- Worksheet preview (center):
  - Header: "Maths Challenge" | Name: _______
  - Metadata: "{X} Questions — Testing: {tables}"
  - Questions grid: 5 columns of questions like "3 × 4 = _____"
  - Footer: "Good luck!"

**Font Sizes (Screen Preview - Current):**
- **Header title:** `text-lg` (18px) + CSS: `1.25rem` (20px)
- **Header name:** `text-xs` (12px) + CSS: `0.875rem` (14px)
- **Header meta:** `text-xs` (12px) + CSS: `0.875rem` (14px)
- **Questions:** `text-sm` (14px) + CSS: `1rem` (16px)
- **Footer:** CSS: `1rem` (16px)

**Typography Config:** Derived from `typography.worksheet.question.screen`
- Approximately 40% of game baseline (16px vs 48px)

**⚠️ ISSUE:** If this screen shows sizes that look too big/small compared to the main game area, this is likely the problem area.

---

## 7. WORKSHEET PDF OUTPUT (Print View)
**File:** `src/components/Worksheet.tsx`
**State:** When "Print Worksheet" is clicked or Print Preview shown

**Description:** The actual PDF that gets printed - optimized for A4 paper

**Layout:**
- Same as screen preview but with print-optimized spacing
- A4 dimensions: 210mm × 297mm
- Margins: Left 12mm, Right 3mm, Top/Bottom 10mm
- Printable area: 195mm × 263mm
- Grid: 5 columns × 39mm each
- Questions area: 235mm height

**Font Sizes (Print/PDF - Current):**
Using shared typography config from `src/lib/typography.ts`:
- **20 questions (4 rows):** 18pt
- **40 questions (8 rows):** 17pt
- **60 questions (12 rows):** 16pt
- **80 questions (16 rows):** 15pt
- **100 questions (20 rows):** 14pt
- **125 questions (25 rows):** 13pt

**Typography Config:** `typography.worksheet.question.print[count]`
- Increased by 2pt from original (16pt→18pt, etc.)

---

## Font Size Hierarchy & Relationships

```
BASELINE (Main Game Play Area):
├─ Question Display: 48px mobile, 60px tablet, 72px desktop ⭐ PRIMARY
├─ Equals/Operators: 24px mobile, 30px tablet
├─ Answers: 30px mobile, 36px tablet
└─ Inputs/Options: 24px mobile, 36px tablet

DERIVED (Other Screens):
├─ Game Setup: 28px/40px title, 13px/16px subtitle
├─ Print Setup: 24px/48px title, 14px/18px subtitle
└─ Worksheet Preview: ~40% of game baseline
    ├─ Screen: 16px-20px (compact for grid)
    └─ Print: 13pt-18pt (optimized for A4)
```

---

## Shared Configuration

**File:** `src/lib/typography.ts`

This file contains the centralized typography system:
- `typography.game.*` - Main game area (PRIMARY BASELINE)
- `typography.setup.*` - **Setup screens (GameSetup & PrintResources) - SHARED**
  - Mobile optimizations inherited from GameSetup
  - One change affects both screens
- `typography.worksheet.*` - Derived from game baseline
- Helper: `getWorksheetPrintFontSize(count)` - Returns appropriate print size
- Helper: `getSetupClasses()` - Returns combined setup screen classes

**Key Principle:** Changes to `typography.ts` propagate to all screens

**Shared Screens:**
- Game Setup (#2) and Print Resources Setup (#5) use **identical** `typography.setup.*` config

---

## Common Components

### User Selector
- Dropdown showing current user
- "Switch User" and "New User" options
- Appears on: Game Setup, Print Resources Setup, Worksheet Preview

### Theme/Menu Selector
- Theme color picker (Primary, Secondary, Accent)
- Appears on: Game Setup (desktop and mobile versions)

---

## Identifying Your Issue

**To pinpoint which screen has the font size issue:**

1. **Is it the main game when playing?** → Screen #3 (GamePlay.tsx)
2. **Is it the setup before playing?** → Screen #2 (GameSetup.tsx)
3. **Is it the print setup page?** → Screen #5 (PrintResources.tsx)
4. **Is it the worksheet preview on screen?** → Screen #6 (Worksheet preview/screen view)
5. **Is it the printed PDF?** → Screen #7 (Worksheet PDF output)

**Most likely candidates for "print area" issues:**
- Screen #6: Worksheet Preview (screen view before printing)
- Screen #7: Worksheet PDF Output (actual print)

---

## Recent Changes

### Latest Font Size Adjustments:
1. Created `typography.ts` with game as baseline
2. Worksheet screen preview reduced to match main area (16px-20px)
3. Worksheet PDF print increased by 2pt (18pt-13pt)
4. Added `@media screen` overrides to prevent print styles bleeding

### Version: v0.1.0-30e526d

---

## Notes

- All measurements use responsive design (mobile → tablet → desktop)
- Tailwind classes: `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), etc.
- Print uses `pt` units: 13pt ≈ 17px, 18pt ≈ 24px
- Typography system ensures consistency across screens
