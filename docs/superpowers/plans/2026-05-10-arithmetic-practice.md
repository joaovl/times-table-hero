# Arithmetic Practice & Modular Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the home screen into a modular Hub and add an arithmetic-practice module (`+`, `−`, `×` with multi-digit numbers) for both online play and printable worksheets.

**Architecture:** Approach C — sibling self-contained modules under `src/modules/`. Phase A relocates the existing times-tables code into its own module folder and replaces the home page with a Hub. Phase B adds the arithmetic module. Each module owns its setup / play / results / print / logic / pdf / storage. No shared "module interface" yet (rule of three).

**Tech Stack:** TypeScript, React 18, react-router-dom v6, Vitest, jsPDF, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-05-10-arithmetic-practice-design.md`

---

## File Map

### Phase A — moved files (`git mv` to keep history)

| From | To |
|------|----|
| `src/lib/gameLogic.ts` | `src/modules/times-tables/logic.ts` |
| `src/lib/gameLogic.test.ts` | `src/modules/times-tables/logic.test.ts` |
| `src/lib/worksheetPdf.ts` | `src/modules/times-tables/pdf.ts` |
| `src/lib/gameStorage.ts` | `src/modules/times-tables/storage.ts` |
| `src/lib/gameStorage.test.ts` | `src/modules/times-tables/storage.test.ts` |
| `src/components/game/GameSetup.tsx` | `src/modules/times-tables/TimesTablesSetup.tsx` |
| `src/components/game/GamePlay.tsx` | `src/modules/times-tables/TimesTablesPlay.tsx` |
| `src/components/game/GameResults.tsx` | `src/modules/times-tables/TimesTablesResults.tsx` |
| `src/components/game/QuestionDisplay.tsx` | `src/modules/times-tables/QuestionDisplay.tsx` |
| `src/components/Worksheet.tsx` | `src/modules/times-tables/TimesTablesWorksheet.tsx` |
| `src/pages/PrintResources.tsx` | `src/modules/times-tables/TimesTablesPrint.tsx` |
| `src/pages/Index.tsx` | `src/modules/times-tables/TimesTablesIndex.tsx` |

(QuestionDisplay moves with the times-tables module — it currently imports `Question` from `gameLogic`, so it's coupled to that module. We'll re-extract a shared variant when a second consumer needs it.)

### Phase A — new files

- `src/pages/Hub.tsx`

### Phase A — modified files

- `src/App.tsx` — routes change

### Phase B — new files

- `src/modules/arithmetic/logic.ts`
- `src/modules/arithmetic/logic.test.ts`
- `src/modules/arithmetic/storage.ts`
- `src/modules/arithmetic/pdf.ts`
- `src/modules/arithmetic/ArithmeticSetup.tsx`
- `src/modules/arithmetic/ArithmeticPlay.tsx`
- `src/modules/arithmetic/ArithmeticResults.tsx`
- `src/modules/arithmetic/ArithmeticIndex.tsx`
- `src/modules/arithmetic/ArithmeticWorksheet.tsx`
- `src/modules/arithmetic/ArithmeticPrint.tsx`

### Phase B — modified files

- `src/App.tsx` — register `/arithmetic` and `/arithmetic/print` routes
- `src/pages/Hub.tsx` — Arithmetic card becomes enabled

---

# Phase A — Modular restructure + Hub

> Goal of phase A: existing times-tables behaviour reachable from `/times-tables`, no behaviour change otherwise. Hub at `/` shows a Times Tables card and a placeholder Arithmetic card. Tests + build still green.

## Task 1: Move logic / pdf / storage modules with `git mv`

**Files:**
- Move 5 files into `src/modules/times-tables/`

- [ ] **Step 1: Create the destination folder and move logic files**

```bash
mkdir -p src/modules/times-tables
git mv src/lib/gameLogic.ts src/modules/times-tables/logic.ts
git mv src/lib/gameLogic.test.ts src/modules/times-tables/logic.test.ts
git mv src/lib/worksheetPdf.ts src/modules/times-tables/pdf.ts
git mv src/lib/gameStorage.ts src/modules/times-tables/storage.ts
git mv src/lib/gameStorage.test.ts src/modules/times-tables/storage.test.ts
```

- [ ] **Step 2: Fix internal cross-references inside moved files**

In `src/modules/times-tables/storage.ts`, change the import line:

```ts
import type { Question, BinaryOp, UnaryOp } from './gameLogic';
```

to:

```ts
import type { Question, BinaryOp, UnaryOp } from './logic';
```

In `src/modules/times-tables/pdf.ts`, change:

```ts
import type { Question } from './gameLogic';
```

to:

```ts
import type { Question } from './logic';
```

In `src/modules/times-tables/logic.test.ts`, change:

```ts
import { generateQuestions, generateWrongAnswers, shuffleOptions } from './gameLogic';
import type { Question } from './gameLogic';
```

to:

```ts
import { generateQuestions, generateWrongAnswers, shuffleOptions } from './logic';
import type { Question } from './logic';
```

In `src/modules/times-tables/storage.test.ts`, change:

```ts
} from './gameStorage';
import type { Question } from './gameLogic';
```

to:

```ts
} from './storage';
import type { Question } from './logic';
```

- [ ] **Step 3: Run tests — verify they still pass after the move**

Run: `npx vitest run`
Expected: 22 tests pass.

- [ ] **Step 4: Do not commit yet** — consumers in components still import from `@/lib/...`. Continue to Task 2.

---

## Task 2: Move QuestionDisplay component

**Files:**
- Move: `src/components/game/QuestionDisplay.tsx` → `src/modules/times-tables/QuestionDisplay.tsx`

- [ ] **Step 1: Move file**

```bash
git mv src/components/game/QuestionDisplay.tsx src/modules/times-tables/QuestionDisplay.tsx
```

- [ ] **Step 2: Fix the import inside the moved file**

In `src/modules/times-tables/QuestionDisplay.tsx`, change:

```tsx
import type { Question } from '@/lib/gameLogic';
```

to:

```tsx
import type { Question } from './logic';
```

---

## Task 3: Move and rename game components

**Files:**
- Move: `src/components/game/GameSetup.tsx` → `src/modules/times-tables/TimesTablesSetup.tsx`
- Move: `src/components/game/GamePlay.tsx` → `src/modules/times-tables/TimesTablesPlay.tsx`
- Move: `src/components/game/GameResults.tsx` → `src/modules/times-tables/TimesTablesResults.tsx`
- Move: `src/components/Worksheet.tsx` → `src/modules/times-tables/TimesTablesWorksheet.tsx`

- [ ] **Step 1: `git mv` each file**

```bash
git mv src/components/game/GameSetup.tsx src/modules/times-tables/TimesTablesSetup.tsx
git mv src/components/game/GamePlay.tsx src/modules/times-tables/TimesTablesPlay.tsx
git mv src/components/game/GameResults.tsx src/modules/times-tables/TimesTablesResults.tsx
git mv src/components/Worksheet.tsx src/modules/times-tables/TimesTablesWorksheet.tsx
```

- [ ] **Step 2: Rename the exported function in each moved file**

In `src/modules/times-tables/TimesTablesSetup.tsx`:
- Change `export function GameSetup(` to `export function TimesTablesSetup(`
- Change `interface GameSetupProps` to `interface TimesTablesSetupProps`
- Update the function signature `: GameSetupProps` to `: TimesTablesSetupProps`

In `src/modules/times-tables/TimesTablesPlay.tsx`:
- Change `export function GamePlay(` to `export function TimesTablesPlay(`
- Change `interface GamePlayProps` to `interface TimesTablesPlayProps`
- Update the function signature `: GamePlayProps` to `: TimesTablesPlayProps`
- The exported `GameResults` interface and `GameResultIncorrect` type stay named the same (those are domain types, not the component name).

In `src/modules/times-tables/TimesTablesResults.tsx`:
- Change `export function GameResults(` to `export function TimesTablesResults(`
- Change `interface GameResultsProps` to `interface TimesTablesResultsProps`
- Update the function signature accordingly.

In `src/modules/times-tables/TimesTablesWorksheet.tsx`:
- Change `export function Worksheet(` to `export function TimesTablesWorksheet(`
- Change `interface WorksheetProps` to `interface TimesTablesWorksheetProps`
- Update the signature.

- [ ] **Step 3: Fix imports inside each moved file**

In `src/modules/times-tables/TimesTablesSetup.tsx`, change:

```tsx
import type { Difficulty, GameMode, GameSettings, Operation } from '@/lib/gameLogic';
import { getTotalStats, getSavedSettings, saveSettings } from '@/lib/gameStorage';
```

to:

```tsx
import type { Difficulty, GameMode, GameSettings, Operation } from './logic';
import { getTotalStats, getSavedSettings, saveSettings } from './storage';
```

In `src/modules/times-tables/TimesTablesPlay.tsx`, change:

```tsx
import type { GameSettings, Question } from '@/lib/gameLogic';
import {
  generateQuestions,
  generateWrongAnswers,
  shuffleOptions,
  getRandomPositiveMessage,
} from '@/lib/gameLogic';
import { recordAnswer } from '@/lib/gameStorage';
import { QuestionDisplay } from './QuestionDisplay';
```

to:

```tsx
import type { GameSettings, Question } from './logic';
import {
  generateQuestions,
  generateWrongAnswers,
  shuffleOptions,
  getRandomPositiveMessage,
} from './logic';
import { recordAnswer } from './storage';
import { QuestionDisplay } from './QuestionDisplay';
```

In `src/modules/times-tables/TimesTablesResults.tsx`, change:

```tsx
import type { GameResults as GameResultsType } from './GamePlay';
import { getProgress, getQuestionKey, saveSession } from '@/lib/gameStorage';
import type { Question } from '@/lib/gameLogic';
import { QuestionDisplay } from './QuestionDisplay';
```

to:

```tsx
import type { GameResults as GameResultsType } from './TimesTablesPlay';
import { getProgress, getQuestionKey, saveSession } from './storage';
import type { Question } from './logic';
import { QuestionDisplay } from './QuestionDisplay';
```

In `src/modules/times-tables/TimesTablesWorksheet.tsx`, change:

```tsx
import { generateWorksheetPdf } from '@/lib/worksheetPdf';
import { generateQuestions } from '@/lib/gameLogic';
import type { Operation } from '@/lib/gameLogic';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
```

to:

```tsx
import { generateWorksheetPdf } from './pdf';
import { generateQuestions } from './logic';
import type { Operation } from './logic';
import { QuestionDisplay } from './QuestionDisplay';
```

(`@/lib/typography` import in this file stays — typography is shared.)

- [ ] **Step 4: Delete the now-empty `src/components/game/` directory if empty**

```bash
rmdir src/components/game 2>/dev/null || true
```

(If the directory still has anything in it, leave it. The `rmdir` only removes empty dirs.)

---

## Task 4: Move PrintResources page

**Files:**
- Move: `src/pages/PrintResources.tsx` → `src/modules/times-tables/TimesTablesPrint.tsx`

- [ ] **Step 1: Move file**

```bash
git mv src/pages/PrintResources.tsx src/modules/times-tables/TimesTablesPrint.tsx
```

- [ ] **Step 2: Rename the default export and adjust imports**

In `src/modules/times-tables/TimesTablesPrint.tsx`:

Change:

```tsx
import { Worksheet } from '@/components/Worksheet';
import { getSetupClasses } from '@/lib/typography';
import { getSavedPrintSettings, savePrintSettings } from '@/lib/gameStorage';
```

to:

```tsx
import { TimesTablesWorksheet } from './TimesTablesWorksheet';
import { getSetupClasses } from '@/lib/typography';
import { getSavedPrintSettings, savePrintSettings } from './storage';
```

Change:

```tsx
const PrintResources = () => {
```

to:

```tsx
const TimesTablesPrint = () => {
```

Inside the JSX where the file uses `<Worksheet ...>`, change to `<TimesTablesWorksheet ...>`.

The `navigate('/')` call inside `handleBackToMenu` becomes `navigate('/times-tables')`:

```tsx
const handleBackToMenu = () => {
  navigate('/times-tables');
};
```

Change the bottom default export:

```tsx
export default TimesTablesPrint;
```

---

## Task 5: Move Index page (the times-tables orchestrator)

**Files:**
- Move: `src/pages/Index.tsx` → `src/modules/times-tables/TimesTablesIndex.tsx`

- [ ] **Step 1: Move file**

```bash
git mv src/pages/Index.tsx src/modules/times-tables/TimesTablesIndex.tsx
```

- [ ] **Step 2: Rewrite the file body**

Replace the contents of `src/modules/times-tables/TimesTablesIndex.tsx` with:

```tsx
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimesTablesSetup } from './TimesTablesSetup';
import { TimesTablesPlay, GameResults as GameResultsType } from './TimesTablesPlay';
import { TimesTablesResults } from './TimesTablesResults';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import type { GameSettings } from './logic';

type GameState = 'setup' | 'playing' | 'results';

const TimesTablesIndex = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>('setup');
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [results, setResults] = useState<GameResultsType | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleStart = (newSettings: GameSettings) => {
    setSettings(newSettings);
    setResults(null);
    setGameState('playing');
  };

  const handleComplete = useCallback((gameResults: GameResultsType) => {
    setResults(gameResults);
    setGameState('results');
  }, []);

  const handleQuit = () => {
    setGameState('setup');
  };

  const handlePlayAgain = () => {
    setResults(null);
    setGameState('playing');
  };

  const handleNewGame = () => {
    setSettings(null);
    setResults(null);
    setGameState('setup');
  };

  const handleUserChange = (user: UserProfile | null) => {
    setCurrentUser(user);
  };

  const handleNewUser = () => {
    setShowNewUserModal(true);
  };

  const handleUserCreated = (userId: string) => {
    const user = getUserById(userId);
    if (user) setCurrentUser(user);
    setShowNewUserModal(false);
  };

  const handleNavigateToPrint = () => {
    navigate('/times-tables/print');
  };

  return (
    <>
      {gameState === 'setup' && (
        <TimesTablesSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={handleUserChange}
          onNewUser={handleNewUser}
          onNavigateToPrint={handleNavigateToPrint}
          onNavigateToHub={() => navigate('/')}
        />
      )}
      {gameState === 'playing' && settings && (
        <TimesTablesPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={handleQuit}
          userId={currentUser?.id}
        />
      )}
      {gameState === 'results' && results && (
        <TimesTablesResults
          results={results}
          onPlayAgain={handlePlayAgain}
          onNewGame={handleNewGame}
          userId={currentUser?.id}
        />
      )}
      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </>
  );
};

export default TimesTablesIndex;
```

(The new prop `onNavigateToHub` is added so the setup screen has a back button to the Hub. Task 6 wires it up.)

---

## Task 6: Add "Back to Hub" affordance to TimesTablesSetup

**Files:**
- Modify: `src/modules/times-tables/TimesTablesSetup.tsx`

- [ ] **Step 1: Extend the props interface**

Find the interface (was `GameSetupProps`, now `TimesTablesSetupProps`) and add the optional `onNavigateToHub` prop:

```tsx
interface TimesTablesSetupProps {
  onStart: (settings: GameSettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToPrint?: () => void;
  onNavigateToHub?: () => void;
}
```

Add `onNavigateToHub` to the destructured props at the top of the function:

```tsx
export function TimesTablesSetup({ onStart, currentUser, onUserChange, onNewUser, onNavigateToPrint, onNavigateToHub }: TimesTablesSetupProps) {
```

- [ ] **Step 2: Render a Back-to-Hub button at the top of the page**

Find the title block (the `<h1 ...>Maths Challenge</h1>` near the top of the JSX). Above it, insert:

```tsx
{onNavigateToHub && (
  <button
    onClick={onNavigateToHub}
    className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base mb-2"
  >
    ← Hub
  </button>
)}
```

---

## Task 7: Create the Hub page

**Files:**
- Create: `src/pages/Hub.tsx`

- [ ] **Step 1: Create the Hub page**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import { UserProfile, getCurrentUser, getUserById } from '@/lib/userStorage';
import { PRESET_THEMES, DEFAULT_THEME, getTheme, saveTheme, resetTheme } from '@/lib/themeStorage';

const Hub = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) setShowColorPicker(false);
  }, [showMenu]);

  const handleUserCreated = (userId: string) => {
    const u = getUserById(userId);
    if (u) setCurrentUser(u);
    setShowNewUserModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[800px]">
        {/* Top chrome */}
        <div className="mb-3 md:mb-6 flex items-center justify-between">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Open menu"
              aria-expanded={showMenu}
              className="text-muted-foreground hover:text-foreground transition-colors text-base flex items-center gap-1.5 min-h-[44px] px-2 -ml-2"
            >
              <Menu className="w-5 h-5" aria-hidden="true" /> Menu
            </button>
            {showMenu && (
              <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-2 z-50 min-w-[200px]">
                <div className="px-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full text-left px-2 py-2 text-sm hover:bg-muted rounded transition-colors flex items-center gap-2 min-h-[44px]"
                  >
                    <Palette className="w-4 h-4" />
                    <div
                      className="w-4 h-4 rounded-full border border-card-border"
                      style={{
                        backgroundColor: currentTheme.customColors?.primary
                          ? `hsl(${currentTheme.customColors.primary})`
                          : `hsl(${currentTheme.hue}, 85%, 58%)`,
                      }}
                    />
                    Colors
                  </button>
                  {showColorPicker && (
                    <div className="px-2 py-2 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_THEMES.map((theme, idx) => (
                          <button
                            key={theme.hue || `custom-${idx}`}
                            onClick={() => {
                              saveTheme(theme);
                              setCurrentTheme(theme);
                            }}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:bg-muted',
                              currentTheme.name === theme.name && 'ring-2 ring-primary bg-muted'
                            )}
                          >
                            <div
                              className="w-11 h-11 rounded-full border border-card-border"
                              style={{
                                backgroundColor: theme.customColors?.primary
                                  ? `hsl(${theme.customColors.primary})`
                                  : `hsl(${theme.hue}, 85%, 58%)`,
                              }}
                            />
                            <span className="text-[9px] text-center text-muted-foreground leading-tight">
                              {theme.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          resetTheme();
                          setCurrentTheme(DEFAULT_THEME);
                        }}
                        className="w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      >
                        Reset to Default
                      </button>
                    </div>
                  )}
                </div>
                <div className="border-t mt-1 pt-1.5 px-4 pb-1 text-[10px] text-muted-foreground/60">
                  v0.1.0-{(globalThis as unknown as { __GIT_HASH__?: string }).__GIT_HASH__ || 'dev'}
                </div>
              </div>
            )}
          </div>
          <UserSelector
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            onNewUser={() => setShowNewUserModal(true)}
          />
        </div>

        <h1 className="text-[22px] md:text-[36px] font-bold text-primary flex items-center justify-center gap-2 mb-1 md:mb-2">
          <img src="/favicon.png" alt="Maths Challenge" className="w-6 h-6 md:w-10 md:h-10" />
          Maths Challenge
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-4 md:mb-6">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick what to practise today
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card
            onClick={() => navigate('/times-tables')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">×</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Times Tables</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              ×  ÷  x²  √ &middot; Tables 1–12
            </div>
          </Card>

          <Card
            onClick={() => navigate('/arithmetic')}
            className="p-5 md:p-6 shadow-card cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-primary text-center mb-2">+</div>
            <div className="text-lg md:text-xl font-bold text-foreground text-center">Arithmetic</div>
            <div className="text-xs md:text-sm text-muted-foreground text-center mt-1">
              +  −  × &middot; 1–5 digits
            </div>
          </Card>

          <Card className="p-5 md:p-6 shadow-card opacity-60 md:col-span-2">
            <div className="text-base md:text-lg font-bold text-muted-foreground text-center">Coming soon</div>
            <div className="text-xs text-muted-foreground/80 text-center mt-1">
              Charts &middot; Time &middot; Shapes &middot; Fractions
            </div>
          </Card>
        </div>
      </div>

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}
    </div>
  );
};

export default Hub;
```

Note: the Arithmetic card route is wired now even though the route is registered in Phase B; an attempt to click it before Phase B completes will land on the NotFound page. That's fine for the intermediate state — Phase B finishes the wiring.

---

## Task 8: Wire routes — Phase A version

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the body of `src/App.tsx`**

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import TimesTablesIndex from './modules/times-tables/TimesTablesIndex';
import TimesTablesPrint from './modules/times-tables/TimesTablesPrint';
import NotFound from './pages/NotFound';
import { getTheme, applyTheme } from '@/lib/themeStorage';

const App = () => {
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/times-tables" element={<TimesTablesIndex />} />
        <Route path="/times-tables/print" element={<TimesTablesPrint />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
```

---

## Task 9: Verify Phase A end-to-end

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Tests**

Run: `npx vitest run`
Expected: 22 tests pass (same suite as before, just relocated).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev`. Navigate to `/`. Verify:
- Hub renders with Times Tables card and Arithmetic card.
- Click Times Tables → existing times-tables setup page (with new "← Hub" button at top).
- Game → results → play again still works.
- Menu → Print Worksheets → renders worksheet page (now at `/times-tables/print`).
- Menu → Back arrow returns to `/times-tables`.
- Click Arithmetic on Hub → 404 NotFound (acceptable; Phase B fixes).

- [ ] **Step 5: Commit Phase A**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Restructure into module folders and add Hub home page

Move existing times-tables files under src/modules/times-tables/.
Add Hub at / with Times Tables and Arithmetic cards (arithmetic
unrouted until phase B). Routes for times tables now under
/times-tables and /times-tables/print.
EOF
)"
```

---

# Phase B — Arithmetic module

> Phase B introduces the new module. Each task is independently testable. Phase ends with arithmetic accessible from the Hub.

## Task 10: Arithmetic types, carry/borrow counters, and pure helpers (TDD)

**Files:**
- Create: `src/modules/arithmetic/logic.ts`
- Create: `src/modules/arithmetic/logic.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/modules/arithmetic/logic.test.ts
import { describe, it, expect } from 'vitest';
import { countCarries, countBorrows } from './logic';

describe('countCarries', () => {
  it.each([
    [123, 456, 0],
    [19, 1, 1],
    [99, 1, 2],
    [999, 1, 3],
    [12345, 67890, 4],
  ])('countCarries(%i, %i) = %i', (a, b, expected) => {
    expect(countCarries(a, b)).toBe(expected);
  });
});

describe('countBorrows', () => {
  it.each([
    [45, 23, 0],
    [30, 12, 1],
    [300, 12, 2],
    [1000, 1, 3],
    [50000, 1, 4],
  ])('countBorrows(%i, %i) = %i', (a, b, expected) => {
    expect(countBorrows(a, b)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail (module doesn't exist yet)**

Run: `npx vitest run src/modules/arithmetic/logic.test.ts`
Expected: failures (cannot find module).

- [ ] **Step 3: Create `logic.ts` with types and counters**

```ts
// src/modules/arithmetic/logic.ts
export type ArithOp = 'add' | 'subtract' | 'multiply' | 'all';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DigitMode =
  | { kind: 'exact'; digits: number }
  | { kind: 'upTo'; digits: number };

export interface ArithQuestion {
  op: 'add' | 'subtract' | 'multiply';
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

export function countCarries(a: number, b: number): number {
  let av = a, bv = b, carry = 0, carries = 0;
  while (av > 0 || bv > 0 || carry > 0) {
    const sum = (av % 10) + (bv % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry) carries++;
    av = Math.floor(av / 10);
    bv = Math.floor(bv / 10);
  }
  return carries;
}

export function countBorrows(a: number, b: number): number {
  let av = a, bv = b, borrows = 0;
  while (av > 0 || bv > 0) {
    const ad = av % 10;
    const bd = bv % 10;
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

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/modules/arithmetic/logic.test.ts`
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/arithmetic/logic.ts src/modules/arithmetic/logic.test.ts
git commit -m "Add arithmetic types and carry/borrow column counters"
```

---

## Task 11: Arithmetic question generator (TDD)

**Files:**
- Modify: `src/modules/arithmetic/logic.ts`
- Modify: `src/modules/arithmetic/logic.test.ts`

- [ ] **Step 1: Append generator tests to `logic.test.ts`**

```ts
import { generateArithQuestions } from './logic';
import type { ArithSettings, DigitMode } from './logic';

const baseSettings = (over: Partial<ArithSettings>): ArithSettings => ({
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

const digitsOf = (n: number) => (n === 0 ? 1 : Math.floor(Math.log10(n)) + 1);

describe('generateArithQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateArithQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });
});

describe('generateArithQuestions — add difficulty buckets', () => {
  it('easy add: 0 carries', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'easy', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => {
      expect(q.op).toBe('add');
      expect(countCarries(q.operand1, q.operand2)).toBe(0);
    });
  });

  it('medium add: exactly 1 carry', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => {
      expect(countCarries(q.operand1, q.operand2)).toBe(1);
    });
  });

  it('hard add: ≥2 carries', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'hard', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => {
      expect(countCarries(q.operand1, q.operand2)).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('generateArithQuestions — subtract', () => {
  it('never produces negative answers', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'subtract', difficulty: 'hard', digitMode: { kind: 'exact', digits: 4 } }),
      80
    );
    qs.forEach(q => {
      expect(q.op).toBe('subtract');
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.operand1).toBeGreaterThanOrEqual(q.operand2);
    });
  });

  it('easy subtract: 0 borrows', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'subtract', difficulty: 'easy', digitMode: { kind: 'exact', digits: 3 } }),
      40
    );
    qs.forEach(q => expect(countBorrows(q.operand1, q.operand2)).toBe(0));
  });
});

describe('generateArithQuestions — multiply digit cap', () => {
  it('5-digit setting still caps multiplication operands at 3 digits max', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'multiply', difficulty: 'hard', digitMode: { kind: 'exact', digits: 5 } }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBeLessThanOrEqual(3);
      expect(digitsOf(q.operand2)).toBeLessThanOrEqual(3);
    });
  });
});

describe('generateArithQuestions — all', () => {
  it('mixes add, subtract, and multiply', () => {
    const qs = generateArithQuestions(
      baseSettings({ operation: 'all', digitMode: { kind: 'exact', digits: 2 }, difficulty: 'medium' }),
      120
    );
    const ops = new Set(qs.map(q => q.op));
    expect(ops.has('add')).toBe(true);
    expect(ops.has('subtract')).toBe(true);
    expect(ops.has('multiply')).toBe(true);
  });
});

describe('generateArithQuestions — digit mode', () => {
  it('exact: both operands have the requested digit count', () => {
    const dm: DigitMode = { kind: 'exact', digits: 3 };
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'medium', digitMode: dm }),
      40
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBe(3);
      expect(digitsOf(q.operand2)).toBe(3);
    });
  });

  it('upTo: each operand has 1..N digits', () => {
    const dm: DigitMode = { kind: 'upTo', digits: 3 };
    const qs = generateArithQuestions(
      baseSettings({ operation: 'add', difficulty: 'easy', digitMode: dm }),
      80
    );
    qs.forEach(q => {
      expect(digitsOf(q.operand1)).toBeGreaterThanOrEqual(1);
      expect(digitsOf(q.operand1)).toBeLessThanOrEqual(3);
      expect(digitsOf(q.operand2)).toBeGreaterThanOrEqual(1);
      expect(digitsOf(q.operand2)).toBeLessThanOrEqual(3);
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail (function not exported)**

Run: `npx vitest run src/modules/arithmetic/logic.test.ts`
Expected: failures referencing `generateArithQuestions`.

- [ ] **Step 3: Append generator implementation to `logic.ts`**

```ts
function digitsToRange(d: number): { min: number; max: number } {
  if (d <= 1) return { min: 0, max: 9 };
  return { min: 10 ** (d - 1), max: 10 ** d - 1 };
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickDigitCount(mode: DigitMode, cap: number): number {
  const target = Math.min(mode.digits, cap);
  if (mode.kind === 'exact') return target;
  return randInt(1, target);
}

function multiplyDigitPair(diff: Difficulty, cap: number): [number, number] {
  if (diff === 'easy') return [Math.min(1, cap), Math.min(1, cap)];
  if (diff === 'medium') return [Math.min(1, cap), Math.min(2, cap)];
  // hard: prefer 2x2, fall back to 2x3 / 1x3 if cap allows
  if (cap >= 2) return [2, Math.min(2, cap)];
  return [1, 1];
}

function trySample(settings: ArithSettings, op: 'add' | 'subtract' | 'multiply'): ArithQuestion | null {
  const { difficulty, digitMode } = settings;

  if (op === 'multiply') {
    const cap = Math.min(digitMode.digits, 3);
    const [d1, d2] = multiplyDigitPair(difficulty, cap);
    const r1 = digitsToRange(d1);
    const r2 = digitsToRange(d2);
    const a = randInt(r1.min, r1.max);
    const b = randInt(r2.min, r2.max);
    return { op: 'multiply', operand1: a, operand2: b, answer: a * b };
  }

  const d1 = pickDigitCount(digitMode, digitMode.digits);
  const d2 = pickDigitCount(digitMode, digitMode.digits);
  const r1 = digitsToRange(d1);
  const r2 = digitsToRange(d2);
  let a = randInt(r1.min, r1.max);
  let b = randInt(r2.min, r2.max);

  if (op === 'subtract' && a < b) [a, b] = [b, a];

  const carries = countCarries(a, b);
  const borrows = countBorrows(a, b);
  const matches =
    op === 'add'
      ? (difficulty === 'easy' ? carries === 0 : difficulty === 'medium' ? carries === 1 : carries >= 2)
      : (difficulty === 'easy' ? borrows === 0 : difficulty === 'medium' ? borrows === 1 : borrows >= 2);

  if (!matches) return null;

  return op === 'add'
    ? { op: 'add', operand1: a, operand2: b, answer: a + b }
    : { op: 'subtract', operand1: a, operand2: b, answer: a - b };
}

export function generateArithQuestions(settings: ArithSettings, count: number): ArithQuestion[] {
  const result: ArithQuestion[] = [];
  const concreteOps: Array<'add' | 'subtract' | 'multiply'> =
    settings.operation === 'all' ? ['add', 'subtract', 'multiply'] : [settings.operation];

  while (result.length < count) {
    const op = concreteOps[randInt(0, concreteOps.length - 1)];

    let q: ArithQuestion | null = null;
    for (let i = 0; i < 200 && q === null; i++) {
      q = trySample(settings, op);
    }

    if (!q) {
      // Last-resort fallback: random sample, accept any difficulty.
      const dm = settings.digitMode;
      const d = pickDigitCount(dm, dm.digits);
      const r = digitsToRange(d);
      const a = randInt(r.min, r.max);
      const b = randInt(r.min, r.max);
      if (op === 'add') q = { op, operand1: a, operand2: b, answer: a + b };
      else if (op === 'subtract') {
        const [hi, lo] = a >= b ? [a, b] : [b, a];
        q = { op: 'subtract', operand1: hi, operand2: lo, answer: hi - lo };
      } else {
        q = { op: 'multiply', operand1: a, operand2: b, answer: a * b };
      }
    }
    result.push(q);
  }

  return result;
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/modules/arithmetic/logic.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/arithmetic/logic.ts src/modules/arithmetic/logic.test.ts
git commit -m "Add arithmetic question generator with difficulty buckets"
```

---

## Task 12: Arithmetic storage (settings + sessions)

**Files:**
- Create: `src/modules/arithmetic/storage.ts`

- [ ] **Step 1: Create the storage module**

```ts
// src/modules/arithmetic/storage.ts
import type { ArithSettings, ArithOp, Difficulty, DigitMode } from './logic';

function key(base: string, userId?: string): string {
  return userId ? `arithmetic-${base}-${userId}` : `arithmetic-${base}`;
}

const DEFAULT_SETTINGS: ArithSettings = {
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
};

export function getSavedArithSettings(userId?: string): ArithSettings {
  try {
    const data = localStorage.getItem(key('settings', userId));
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveArithSettings(s: ArithSettings, userId?: string): void {
  try {
    localStorage.setItem(key('settings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ArithPrintSettings {
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
  questionCount: number;
  pageCount: number;
}

const DEFAULT_PRINT: ArithPrintSettings = {
  operation: 'add',
  difficulty: 'easy',
  digitMode: { kind: 'exact', digits: 2 },
  questionCount: 30,
  pageCount: 1,
};

export function getSavedArithPrintSettings(userId?: string): ArithPrintSettings {
  try {
    const data = localStorage.getItem(key('printSettings', userId));
    if (data) return { ...DEFAULT_PRINT, ...JSON.parse(data) };
    return DEFAULT_PRINT;
  } catch {
    return DEFAULT_PRINT;
  }
}

export function saveArithPrintSettings(s: ArithPrintSettings, userId?: string): void {
  try {
    localStorage.setItem(key('printSettings', userId), JSON.stringify(s));
  } catch {
    // ignore
  }
}

export interface ArithSession {
  date: string;
  score: number;
  total: number;
  operation: ArithOp;
  difficulty: Difficulty;
  digitMode: DigitMode;
}

export function saveArithSession(s: ArithSession, userId?: string): void {
  try {
    const k = key('sessions', userId);
    const raw = localStorage.getItem(k);
    const list: ArithSession[] = raw ? JSON.parse(raw) : [];
    list.push(s);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch {
    // ignore
  }
}

export function getArithSessions(userId?: string): ArithSession[] {
  try {
    const raw = localStorage.getItem(key('sessions', userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/storage.ts
git commit -m "Add arithmetic storage for settings, print settings, and sessions"
```

---

## Task 13: Arithmetic setup screen

**Files:**
- Create: `src/modules/arithmetic/ArithmeticSetup.tsx`

- [ ] **Step 1: Create the setup component**

```tsx
// src/modules/arithmetic/ArithmeticSetup.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import type { UserProfile } from '@/lib/userStorage';
import type { ArithOp, ArithSettings, Difficulty, DigitMode } from './logic';
import { getSavedArithSettings, saveArithSettings } from './storage';

interface Props {
  onStart: (s: ArithSettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (u: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToHub: () => void;
  onNavigateToPrint: () => void;
}

const QUESTION_COUNTS = [5, 10, 25, 50, 75, 100];
const TIME_LIMITS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];
const DIGIT_BUTTONS = [1, 2, 3, 4, 5];

const DIFFICULTY_HINTS: Record<ArithOp, [string, string, string]> = {
  add: ['No carry', '1 carry', 'Multiple carries'],
  subtract: ['No borrow', '1 borrow', 'Multiple borrows'],
  multiply: ['1 × 1 digit', '1 × 2 digit', '2 × 2 / up to 3 digits'],
  all: ['Easy', 'Medium', 'Hard'],
};

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

export function ArithmeticSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  onNavigateToPrint,
}: Props) {
  const [operation, setOperation] = useState<ArithOp>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [digitMode, setDigitMode] = useState<DigitMode>({ kind: 'exact', digits: 2 });
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedArithSettings(currentUser?.id);
    setOperation(s.operation);
    setDifficulty(s.difficulty);
    setDigitMode(s.digitMode);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveArithSettings(
      { operation, difficulty, digitMode, gameMode, questionCount, timeLimit },
      currentUser?.id
    );
  }, [isLoaded, operation, difficulty, digitMode, gameMode, questionCount, timeLimit, currentUser?.id]);

  const start = () => onStart({ operation, difficulty, digitMode, gameMode, questionCount, timeLimit });

  const hints = DIFFICULTY_HINTS[operation];

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[600px]">
        <button
          onClick={onNavigateToHub}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base mb-2"
        >
          ← Hub
        </button>

        <h1 className="text-[22px] md:text-[36px] font-bold text-primary text-center mb-1 md:mb-2">
          Arithmetic Practice
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick what to work on
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Operation</h2>
          <div className="grid grid-cols-4 gap-1 md:gap-2">
            {([
              { id: 'add', label: '+' },
              { id: 'subtract', label: '−' },
              { id: 'multiply', label: '×' },
              { id: 'all', label: 'All' },
            ] as const).map(op => (
              <button key={op.id} onClick={() => setOperation(op.id)} className={buttonClass(operation === op.id)}>
                <span className="text-[15px] md:text-[18px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Digits</h2>
          <p className="text-[12px] md:text-[14px] text-muted-foreground mb-1">Exactly</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2 mb-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`exact-${d}`}
                onClick={() => setDigitMode({ kind: 'exact', digits: d })}
                className={buttonClass(digitMode.kind === 'exact' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
          <p className="text-[12px] md:text-[14px] text-muted-foreground mb-1">Up to</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`upto-${d}`}
                onClick={() => setDigitMode({ kind: 'upTo', digits: d })}
                className={buttonClass(digitMode.kind === 'upTo' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d, idx) => (
              <div key={d} className="flex flex-col gap-1 md:gap-1.5">
                <button onClick={() => setDifficulty(d)} className={buttonClass(difficulty === d)}>
                  <span className="text-[13px] md:text-[16px]">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                </button>
                <p className="text-[10px] md:text-[12px] text-foreground/70 text-center leading-tight">{hints[idx]}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Game Mode</h2>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setGameMode('questions')} className={cn('flex-1', buttonClass(gameMode === 'questions'))}>
              <span className="text-[13px] md:text-[16px]">Questions</span>
            </button>
            <button onClick={() => setGameMode('time')} className={cn('flex-1', buttonClass(gameMode === 'time'))}>
              <span className="text-[13px] md:text-[16px]">Timed</span>
            </button>
          </div>
          {gameMode === 'questions' ? (
            <div className="grid grid-cols-6 gap-2">
              {QUESTION_COUNTS.map(c => (
                <button key={c} onClick={() => setQuestionCount(c)} className={buttonClass(questionCount === c)}>
                  <span className="text-[15px] md:text-[16px]">{c}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 md:gap-1.5">
              {TIME_LIMITS.map(t => (
                <button key={t.value} onClick={() => setTimeLimit(t.value)} className={buttonClass(timeLimit === t.value)}>
                  <span className="text-[13px] md:text-[16px]">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <Button variant="outline" onClick={onNavigateToPrint} className="py-3 font-bold">
            Print Worksheet
          </Button>
          <Button
            onClick={start}
            className="py-3 md:py-4 text-lg md:text-2xl font-bold bg-gradient-to-b from-primary via-primary/85 to-primary/65 shadow-button transition-all hover:translate-y-[-2px]"
            size="lg"
          >
            Let's Go!
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticSetup.tsx
git commit -m "Add arithmetic setup screen"
```

---

## Task 14: Arithmetic play screen

**Files:**
- Create: `src/modules/arithmetic/ArithmeticPlay.tsx`

- [ ] **Step 1: Create the play component**

```tsx
// src/modules/arithmetic/ArithmeticPlay.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ArithQuestion, ArithSettings } from './logic';
import { generateArithQuestions } from './logic';

export interface ArithGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    op: 'add' | 'subtract' | 'multiply';
    operand1: number;
    operand2: number;
    userAnswer: number | null;
    correctAnswer: number;
  }>;
  settings: ArithSettings;
}

interface Props {
  settings: ArithSettings;
  onComplete: (r: ArithGameResult) => void;
  onQuit: () => void;
}

const symbol = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

function ColumnDisplay({ q }: { q: ArithQuestion }) {
  const a = String(q.operand1);
  const b = String(q.operand2);
  const width = Math.max(a.length, b.length);
  return (
    <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
      <div className="text-right" style={{ minWidth: `${width + 1}ch` }}>{a}</div>
      <div className="text-right" style={{ minWidth: `${width + 1}ch` }}>
        <span className="mr-2">{symbol(q.op)}</span>{b}
      </div>
      <div className="border-t-[3px] border-current mt-1" style={{ minWidth: `${width + 1}ch` }} />
    </div>
  );
}

export function ArithmeticPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ArithQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ArithGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateArithQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIndex, questions.length]);

  useEffect(() => {
    if (settings.gameMode !== 'time' || isComplete) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [settings.gameMode, isComplete]);

  useEffect(() => {
    if (isComplete) {
      onComplete({
        score,
        total: questionsAnswered,
        bestStreak,
        incorrectQuestions: incorrect,
        settings,
      });
    }
  }, [isComplete, score, questionsAnswered, bestStreak, incorrect, settings, onComplete]);

  const submit = useCallback((value: number | null) => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];
    const isCorrect = value === q.answer;

    setQuestionsAnswered(p => p + 1);

    if (isCorrect) {
      setScore(p => p + 1);
      setStreak(p => {
        const next = p + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
      setFeedback('correct');
    } else {
      setStreak(0);
      setFeedback('incorrect');
      setIncorrect(prev => [
        ...prev,
        { op: q.op, operand1: q.operand1, operand2: q.operand2, userAnswer: value, correctAnswer: q.answer },
      ]);
    }

    const delay = isCorrect ? 800 : 1400;
    setTimeout(() => {
      setFeedback('none');
      const next = currentIndex + 1;
      if (settings.gameMode === 'questions' && next >= settings.questionCount) {
        setIsComplete(true);
      } else if (next >= questions.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(next);
      }
    }, delay);
  }, [currentIndex, questions, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(typed, 10);
    submit(isNaN(parsed) ? null : parsed);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress =
    settings.gameMode === 'questions'
      ? (currentIndex / settings.questionCount) * 100
      : ((settings.timeLimit - timeLeft) / settings.timeLimit) * 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">← Quit</Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground"> correct</span>
            </div>
            <div className="text-right">
              {settings.gameMode === 'questions' ? (
                <span className="text-sm md:text-base font-bold">
                  {currentIndex + 1} / {settings.questionCount}
                </span>
              ) : (
                <span className={cn('font-bold text-lg md:text-xl', timeLeft <= 30 ? 'text-destructive' : 'text-foreground')}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </div>
          <div className="h-[10px] overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {streak >= 3 && (
            <div className="mt-2 flex justify-center" role="status" aria-live="polite">
              <span
                key={streak}
                className="animate-bounce-in inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg"
              >
                <Flame className="w-4 h-4" />
                {streak} in a row!
              </span>
            </div>
          )}
        </div>

        <Card
          className={cn(
            'mb-3 md:mb-[19px] py-6 md:py-10 px-4 md:px-8 text-center shadow-card transition-all',
            feedback === 'correct' && 'animate-pop bg-success/10',
            feedback === 'incorrect' && 'animate-shake bg-destructive/10'
          )}
        >
          <ColumnDisplay q={q} />
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">= {q.answer}</div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type the answer"
              className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={typed === ''}
            >
              Check
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticPlay.tsx
git commit -m "Add arithmetic play screen with column display"
```

---

## Task 15: Arithmetic results screen

**Files:**
- Create: `src/modules/arithmetic/ArithmeticResults.tsx`

- [ ] **Step 1: Create the results component**

```tsx
// src/modules/arithmetic/ArithmeticResults.tsx
import { useEffect } from 'react';
import { Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { ArithGameResult } from './ArithmeticPlay';
import { saveArithSession } from './storage';

interface Props {
  result: ArithGameResult;
  onPlayAgain: () => void;
  onNewGame: () => void;
  userId?: string;
}

const symbol = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

export function ArithmeticResults({ result, onPlayAgain, onNewGame, userId }: Props) {
  const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  const stars =
    percentage === 100 ? 5
      : percentage >= 90 ? 4
      : percentage >= 75 ? 3
      : percentage >= 50 ? 2
      : percentage >= 25 ? 1
      : 0;

  useEffect(() => {
    saveArithSession(
      {
        date: new Date().toISOString(),
        score: result.score,
        total: result.total,
        operation: result.settings.operation,
        difficulty: result.settings.difficulty,
        digitMode: result.settings.digitMode,
      },
      userId
    );

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || percentage < 80) return;
    if (percentage === 100) {
      confetti({ origin: { y: 0.7 }, spread: 90, particleCount: 120, startVelocity: 45 });
    } else {
      confetti({ origin: { y: 0.7 }, spread: 70, particleCount: 80 });
    }
  }, [result, userId, percentage]);

  const message =
    percentage === 100 ? "Perfect score! You're a maths superstar!"
      : percentage >= 80 ? 'Brilliant work! Keep it up!'
      : percentage >= 60 ? 'Good effort! Practice makes perfect!'
      : percentage >= 40 ? "Nice try! You'll get better!"
      : "Keep practising, you've got this!";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-1" aria-label={`${stars} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className={cn(
                  'w-10 h-10 md:w-14 md:h-14 transition-all',
                  n <= stars ? 'fill-yellow-400 text-yellow-500' : 'fill-muted text-muted-foreground/40'
                )}
              />
            ))}
          </div>
          <div
            className={cn(
              'mb-4 inline-block rounded-full px-6 py-3',
              percentage >= 80 ? 'bg-success/20' : percentage >= 50 ? 'bg-secondary' : 'bg-accent/20'
            )}
          >
            <div className="text-5xl font-extrabold text-foreground md:text-6xl">
              {result.score}/{result.total}
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{message}</p>
          <p className="mt-2 text-muted-foreground">{percentage}% correct</p>
          {result.bestStreak >= 3 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
              <Flame className="w-4 h-4" />
              Best streak: {result.bestStreak}
            </div>
          )}
        </div>

        {result.incorrectQuestions.length > 0 && (
          <Card className="mb-4 p-4">
            <h3 className="mb-3 font-bold text-foreground">Questions to practise:</h3>
            <div className="space-y-2">
              {result.incorrectQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
                  <span className="font-medium">
                    {q.operand1} {symbol(q.op)} {q.operand2} = {q.correctAnswer}
                  </span>
                  {q.userAnswer !== null && (
                    <span className="text-sm text-destructive">You said: {q.userAnswer}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <Button onClick={onPlayAgain} className="w-full py-6 text-xl font-bold shadow-button">Play Again</Button>
          <Button onClick={onNewGame} variant="outline" className="w-full py-4 font-bold">Change Settings</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticResults.tsx
git commit -m "Add arithmetic results screen with session save"
```

---

## Task 16: Arithmetic worksheet PDF generator

**Files:**
- Create: `src/modules/arithmetic/pdf.ts`

- [ ] **Step 1: Create the PDF generator**

```ts
// src/modules/arithmetic/pdf.ts
import jsPDF from 'jspdf';
import type { ArithQuestion } from './logic';

export interface ArithPdfOptions {
  pages: ArithQuestion[][];
  title: string;
  subtitle: string;
  studentName?: string;
}

const A4_W = 210;
const A4_H = 297;
const MARGIN = 15;
const PRINT_W = A4_W - MARGIN * 2;
const PRINT_H = A4_H - MARGIN * 2;
const HEADER_H = 22;
const FOOTER_H = 12;

function symbol(op: 'add' | 'subtract' | 'multiply'): string {
  return op === 'add' ? '+' : op === 'subtract' ? '−' : '×';
}

function maxOperandDigits(qs: ArithQuestion[]): number {
  let max = 1;
  for (const q of qs) {
    max = Math.max(max, String(q.operand1).length, String(q.operand2).length);
  }
  return max;
}

function gridSpec(maxDigits: number): { cols: number; rows: number; fs: number } {
  if (maxDigits <= 2) return { cols: 4, rows: 10, fs: 14 };
  if (maxDigits === 3) return { cols: 3, rows: 10, fs: 14 };
  return { cols: 2, rows: 10, fs: 13 };
}

function drawHorizontal(doc: jsPDF, q: ArithQuestion, x: number, y: number, fs: number) {
  const eq = `${q.operand1} ${symbol(q.op)} ${q.operand2} =`;
  doc.text(eq, x, y);
  const eqW = doc.getTextWidth(eq);
  const blankStart = x + eqW + 1.5;
  const blankEnd = blankStart + 14;
  doc.setLineWidth(0.3);
  doc.line(blankStart, y + 0.6, blankEnd, y + 0.6);
}

function drawColumn(doc: jsPDF, q: ArithQuestion, x: number, yTop: number, fs: number) {
  const a = String(q.operand1);
  const b = String(q.operand2);
  const width = Math.max(a.length, b.length);
  // Approx mm width per character at this font size
  const charW = fs * 0.55;
  const colW = (width + 1) * charW;

  // Top operand right-aligned
  const lineH = fs * 0.5;
  const aX = x + colW - a.length * charW;
  doc.text(a, aX, yTop);

  // Bottom operand: symbol on the far left of column, operand right-aligned
  const symY = yTop + lineH;
  doc.text(symbol(q.op), x, symY);
  const bX = x + colW - b.length * charW;
  doc.text(b, bX, symY);

  // Horizontal rule
  const ruleY = symY + 1.5;
  doc.setLineWidth(0.4);
  doc.line(x, ruleY, x + colW, ruleY);
}

function drawPage(
  doc: jsPDF,
  questions: ArithQuestion[],
  title: string,
  subtitle: string,
  studentName?: string
) {
  const left = MARGIN;
  const top = MARGIN;
  const right = MARGIN + PRINT_W;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, left, top + 6);

  // Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const nameLabel = 'Name:';
  const nameLabelW = doc.getTextWidth(nameLabel);
  const nameLineEnd = right;
  const nameLineStart = nameLineEnd - 50;
  doc.text(nameLabel, nameLineStart - nameLabelW - 2, top + 6);
  if (studentName) doc.text(studentName, nameLineStart + 1, top + 5.5);
  doc.setLineWidth(0.3);
  doc.line(nameLineStart, top + 7, nameLineEnd, top + 7);

  doc.setLineWidth(0.5);
  doc.line(left, top + 10, right, top + 10);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(subtitle, left, top + 15);
  doc.setTextColor(0);

  const md = maxOperandDigits(questions);
  const useColumn = md >= 4;
  const { cols, rows, fs } = gridSpec(md);
  const cellW = PRINT_W / cols;
  const gridTop = top + HEADER_H;
  const gridH = PRINT_H - HEADER_H - FOOTER_H;
  const rowH = gridH / rows;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fs);

  for (let i = 0; i < questions.length && i < cols * rows; i++) {
    const q = questions[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = left + col * cellW + 2;
    const cellTop = gridTop + row * rowH;
    if (useColumn) {
      drawColumn(doc, q, cellX, cellTop + 4, fs);
    } else {
      const baselineY = cellTop + rowH / 2 + (fs * 0.352778) * 0.35;
      drawHorizontal(doc, q, cellX, baselineY, fs);
    }
  }

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Good luck!', A4_W / 2, top + PRINT_H - 3, { align: 'center' });
}

export function generateArithPdf(opts: ArithPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  opts.pages.forEach((qs, idx) => {
    if (idx > 0) doc.addPage('a4', 'portrait');
    drawPage(doc, qs, opts.title, opts.subtitle, opts.studentName);
  });
  return doc;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/pdf.ts
git commit -m "Add arithmetic worksheet PDF generator"
```

---

## Task 17: Arithmetic worksheet preview component

**Files:**
- Create: `src/modules/arithmetic/ArithmeticWorksheet.tsx`

- [ ] **Step 1: Create the worksheet preview**

```tsx
// src/modules/arithmetic/ArithmeticWorksheet.tsx
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ArithSettings } from './logic';
import { generateArithQuestions } from './logic';
import { generateArithPdf } from './pdf';

interface Props {
  settings: ArithSettings;
  pageCount: number;
  studentName?: string;
  onBack: () => void;
}

const opLabel = (op: ArithSettings['operation']): string =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : op === 'multiply' ? '×' : '+−×';

const symbol = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

export function ArithmeticWorksheet({ settings, pageCount, studentName, onBack }: Props) {
  const actualPages = Math.max(1, Math.min(pageCount, 20));
  const pages = useMemo(
    () => Array.from({ length: actualPages }, () => generateArithQuestions(settings, settings.questionCount)),
    [settings, actualPages]
  );
  const previewQuestions = pages[0];
  const subtitle = `${opLabel(settings.operation)} • ${settings.difficulty} • ${
    settings.digitMode.kind === 'exact' ? `exactly ${settings.digitMode.digits}` : `up to ${settings.digitMode.digits}`
  } digits`;

  const handlePrint = () => {
    const doc = generateArithPdf({
      pages,
      title: 'Maths Challenge — Arithmetic',
      subtitle: `${settings.questionCount} Questions — ${subtitle}`,
      studentName,
    });
    doc.save('maths-arithmetic.pdf');
  };

  const md = previewQuestions.reduce(
    (m, q) => Math.max(m, String(q.operand1).length, String(q.operand2).length),
    1
  );
  const cols = md <= 2 ? 4 : md === 3 ? 3 : 2;
  const useColumn = md >= 4;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-background p-4 border-b sticky top-0 z-10 no-print">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>← Back</Button>
          <div className="text-sm text-muted-foreground">
            {actualPages} {actualPages === 1 ? 'page' : 'pages'} • {settings.questionCount} questions
          </div>
          <Button onClick={handlePrint}>Download PDF</Button>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-4">
          <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
            <div className="text-lg font-bold">Maths Challenge — Arithmetic</div>
            <div className="text-xs">
              Name: <span className="inline-block border-b border-black w-44">{studentName || ''}</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <strong>{settings.questionCount} Questions</strong> — {subtitle}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {previewQuestions.map((q, idx) =>
            useColumn ? (
              <div key={idx} className="font-mono text-base text-right">
                <div>{q.operand1}</div>
                <div>{symbol(q.op)} {q.operand2}</div>
                <div className="border-t border-black mt-1">&nbsp;</div>
              </div>
            ) : (
              <div key={idx} className="text-sm whitespace-nowrap">
                {q.operand1} {symbol(q.op)} {q.operand2} = <span className="inline-block border-b border-black w-10">&nbsp;</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticWorksheet.tsx
git commit -m "Add arithmetic worksheet preview"
```

---

## Task 18: Arithmetic print page

**Files:**
- Create: `src/modules/arithmetic/ArithmeticPrint.tsx`

- [ ] **Step 1: Create the print page**

```tsx
// src/modules/arithmetic/ArithmeticPrint.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { ArithOp, ArithSettings, Difficulty, DigitMode } from './logic';
import { getSavedArithPrintSettings, saveArithPrintSettings } from './storage';
import { ArithmeticWorksheet } from './ArithmeticWorksheet';

const QUESTION_COUNTS = [20, 30, 40, 60, 80];
const PAGE_COUNTS = [1, 3, 5, 10, 20];
const DIGIT_BUTTONS = [1, 2, 3, 4, 5];

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

const ArithmeticPrint = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [operation, setOperation] = useState<ArithOp>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [digitMode, setDigitMode] = useState<DigitMode>({ kind: 'exact', digits: 2 });
  const [questionCount, setQuestionCount] = useState(30);
  const [pageCount, setPageCount] = useState(1);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedArithPrintSettings(currentUser?.id);
    setOperation(s.operation);
    setDifficulty(s.difficulty);
    setDigitMode(s.digitMode);
    setQuestionCount(s.questionCount);
    setPageCount(s.pageCount);
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveArithPrintSettings(
      { operation, difficulty, digitMode, questionCount, pageCount },
      currentUser?.id
    );
  }, [isLoaded, operation, difficulty, digitMode, questionCount, pageCount, currentUser?.id]);

  if (showWorksheet) {
    const s: ArithSettings = {
      operation,
      difficulty,
      digitMode,
      gameMode: 'questions',
      questionCount,
      timeLimit: 0,
    };
    return (
      <ArithmeticWorksheet
        settings={s}
        pageCount={pageCount}
        studentName={currentUser?.name}
        onBack={() => setShowWorksheet(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 md:mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/arithmetic')}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base"
          >
            ← Arithmetic
          </button>
          <h1 className="font-extrabold text-primary text-lg md:text-2xl">Print Arithmetic Worksheet</h1>
          <UserSelector
            currentUser={currentUser}
            onUserChange={setCurrentUser}
            onNewUser={() => setShowNewUserModal(true)}
          />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Operation</h2>
          <div className="grid grid-cols-4 gap-1 md:gap-2">
            {([
              { id: 'add', label: '+' },
              { id: 'subtract', label: '−' },
              { id: 'multiply', label: '×' },
              { id: 'all', label: 'All' },
            ] as const).map(op => (
              <button key={op.id} onClick={() => setOperation(op.id)} className={buttonClass(operation === op.id)}>
                <span className="text-[15px] md:text-[18px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Digits</h2>
          <p className="text-xs text-muted-foreground mb-1">Exactly</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2 mb-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`exact-${d}`}
                onClick={() => setDigitMode({ kind: 'exact', digits: d })}
                className={buttonClass(digitMode.kind === 'exact' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Up to</p>
          <div className="grid grid-cols-5 gap-1 md:gap-2">
            {DIGIT_BUTTONS.map(d => (
              <button
                key={`upto-${d}`}
                onClick={() => setDigitMode({ kind: 'upTo', digits: d })}
                className={buttonClass(digitMode.kind === 'upTo' && digitMode.digits === d)}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Difficulty</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} className={buttonClass(difficulty === d)}>
                <span className="text-[13px] md:text-[16px]">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Number of Questions</h2>
          <div className="grid grid-cols-5 gap-2">
            {QUESTION_COUNTS.map(c => (
              <button key={c} onClick={() => setQuestionCount(c)} className={buttonClass(questionCount === c)}>
                <span className="text-[15px] md:text-[16px]">{c}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 font-semibold text-foreground">Number of Pages</h2>
          <div className="grid grid-cols-5 gap-2">
            {PAGE_COUNTS.map(c => (
              <button key={c} onClick={() => setPageCount(c)} className={buttonClass(pageCount === c)}>
                <span className="text-[15px] md:text-[16px]">{c}</span>
              </button>
            ))}
          </div>
        </Card>

        <Button
          onClick={() => setShowWorksheet(true)}
          className="w-full h-[42px] md:h-[54px] text-[16px] md:text-[22px] font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65"
          size="lg"
        >
          Generate Worksheet
        </Button>
      </div>

      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={(id) => {
            const u = getUserById(id);
            if (u) setCurrentUser(u);
            setShowNewUserModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ArithmeticPrint;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticPrint.tsx
git commit -m "Add arithmetic print page"
```

---

## Task 19: Arithmetic top-level orchestrator

**Files:**
- Create: `src/modules/arithmetic/ArithmeticIndex.tsx`

- [ ] **Step 1: Create orchestrator**

```tsx
// src/modules/arithmetic/ArithmeticIndex.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArithmeticSetup } from './ArithmeticSetup';
import { ArithmeticPlay } from './ArithmeticPlay';
import type { ArithGameResult } from './ArithmeticPlay';
import { ArithmeticResults } from './ArithmeticResults';
import { NewUserModal } from '@/components/NewUserModal';
import type { UserProfile } from '@/lib/userStorage';
import { getCurrentUser, getUserById } from '@/lib/userStorage';
import type { ArithSettings } from './logic';

type State = 'setup' | 'playing' | 'results';

const ArithmeticIndex = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>('setup');
  const [settings, setSettings] = useState<ArithSettings | null>(null);
  const [result, setResult] = useState<ArithGameResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleStart = (s: ArithSettings) => {
    setSettings(s);
    setResult(null);
    setState('playing');
  };

  const handleComplete = useCallback((r: ArithGameResult) => {
    setResult(r);
    setState('results');
  }, []);

  return (
    <>
      {state === 'setup' && (
        <ArithmeticSetup
          onStart={handleStart}
          currentUser={currentUser}
          onUserChange={setCurrentUser}
          onNewUser={() => setShowNewUserModal(true)}
          onNavigateToHub={() => navigate('/')}
          onNavigateToPrint={() => navigate('/arithmetic/print')}
        />
      )}
      {state === 'playing' && settings && (
        <ArithmeticPlay
          settings={settings}
          onComplete={handleComplete}
          onQuit={() => setState('setup')}
        />
      )}
      {state === 'results' && result && (
        <ArithmeticResults
          result={result}
          onPlayAgain={() => {
            setResult(null);
            setState('playing');
          }}
          onNewGame={() => {
            setResult(null);
            setSettings(null);
            setState('setup');
          }}
          userId={currentUser?.id}
        />
      )}
      {showNewUserModal && (
        <NewUserModal
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={(id) => {
            const u = getUserById(id);
            if (u) setCurrentUser(u);
            setShowNewUserModal(false);
          }}
        />
      )}
    </>
  );
};

export default ArithmeticIndex;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/modules/arithmetic/ArithmeticIndex.tsx
git commit -m "Add arithmetic top-level orchestrator"
```

---

## Task 20: Wire arithmetic routes

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `App.tsx` body**

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub';
import TimesTablesIndex from './modules/times-tables/TimesTablesIndex';
import TimesTablesPrint from './modules/times-tables/TimesTablesPrint';
import ArithmeticIndex from './modules/arithmetic/ArithmeticIndex';
import ArithmeticPrint from './modules/arithmetic/ArithmeticPrint';
import NotFound from './pages/NotFound';
import { getTheme, applyTheme } from '@/lib/themeStorage';

const App = () => {
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/times-tables" element={<TimesTablesIndex />} />
        <Route path="/times-tables/print" element={<TimesTablesPrint />} />
        <Route path="/arithmetic" element={<ArithmeticIndex />} />
        <Route path="/arithmetic/print" element={<ArithmeticPrint />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
```

---

## Task 21: Final verification

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Tests**

Run: `npx vitest run`
Expected: all green (22 times-tables tests + the new arithmetic tests).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke**

Run: `npm run dev`. Verify:
- Hub renders both module cards.
- Times Tables flow still works (setup → play → results, print).
- Arithmetic flow:
  - For each operation (add, subtract, multiply, all)
  - For each digit setting (Exactly 1..5; Up to 1..5)
  - For each difficulty (easy, medium, hard)
  - Setup → play → results works; typed answer submits; correct/incorrect feedback shows.
- Arithmetic print:
  - Generates worksheet preview at each digit setting.
  - PDF download produces a clean A4 with column form for ≥4 digits and horizontal form for ≤3.
- localStorage:
  - `arithmetic-settings`, `arithmetic-printSettings`, `arithmetic-sessions` keys appear after use.
  - Times-tables `maths-challenge-*` keys still work (no collision).

- [ ] **Step 5: Commit Phase B**

```bash
git add src/App.tsx
git commit -m "Wire arithmetic routes into the router"
```

---

## Self-Review Notes

**Spec coverage:**

| Spec section | Task |
|--------------|------|
| Folder restructure | 1, 2, 3, 4, 5 |
| Routing & App.tsx | 8, 20 |
| Hub page | 7 |
| Times Tables back-to-Hub button | 6 |
| Arithmetic types | 10 |
| Difficulty rule helpers (countCarries, countBorrows) | 10 |
| Generator | 11 |
| Storage | 12 |
| Setup screen | 13 |
| Play screen + column display | 14 |
| Results screen + saveArithSession | 15 |
| Worksheet preview | 17 |
| PDF generator | 16 |
| Print page | 18 |
| Index orchestrator | 19 |
| Manual smoke | 9, 21 |

**No placeholders.** Every step has concrete code or commands.

**Type/name consistency.** `TimesTablesSetup`, `TimesTablesPlay`, `TimesTablesResults`, `TimesTablesWorksheet`, `TimesTablesPrint`, `TimesTablesIndex`, `Hub`, `ArithmeticSetup`, `ArithmeticPlay`, `ArithmeticResults`, `ArithmeticWorksheet`, `ArithmeticPrint`, `ArithmeticIndex`, `ArithGameResult`, `ArithSettings`, `ArithQuestion`, `ArithOp`, `DigitMode`, `Difficulty`, `generateArithQuestions`, `countCarries`, `countBorrows`, `getSavedArithSettings`, `saveArithSettings`, `saveArithSession`, `getSavedArithPrintSettings`, `saveArithPrintSettings`, `generateArithPdf` — all referenced consistently across tasks.
