# Squares and Square Roots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `n²` (square) and `√n` (square root) operations to the practice game and printable worksheets, rename "Both" → "All" (mixing all four ops), and consolidate the duplicated question generator.

**Architecture:** Replace the flat `Question` type with a discriminated union (`binary` for ×/÷, `unary` for ²/√). Single `generateQuestions` in `gameLogic.ts` shared by game and worksheet. Reusable `QuestionDisplay` React component renders all four ops with proper superscript/radical. PDF radical drawn with jsPDF line primitives so no Unicode font is needed.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, jsPDF, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-05-10-squares-and-roots-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/gameLogic.ts` | Modify | Types + `generateQuestions` (sole source) + `generateWrongAnswers` (unchanged) |
| `src/lib/gameLogic.test.ts` | Modify | Update existing tests to discriminated union; add tests for square / sqrt / all |
| `src/lib/gameStorage.ts` | Modify | New `getQuestionKey` signature, `recordAnswer` signature, `'both' → 'all'` migration |
| `src/lib/gameStorage.test.ts` | Create | Tests for migration + key scheme |
| `src/components/game/QuestionDisplay.tsx` | Create | Render Question for screen — handles binary, square, sqrt |
| `src/components/game/GamePlay.tsx` | Modify | Use `QuestionDisplay`, adapt `incorrectQuestions` shape, call new `recordAnswer` |
| `src/components/game/GameResults.tsx` | Modify | Render `incorrectQuestions` via `QuestionDisplay`, adapt save/lookup |
| `src/components/game/GameSetup.tsx` | Modify | 5-button operation picker (×, ÷, ², √, All) |
| `src/pages/PrintResources.tsx` | Modify | 5-button operation picker matching GameSetup |
| `src/components/Worksheet.tsx` | Modify | Drop duplicate generator; use `QuestionDisplay` in HTML preview; extend `tableSuffix` |
| `src/lib/worksheetPdf.ts` | Modify | `PdfQuestion` → discriminated union; switch on kind; draw radical via `doc.line()` |

---

## Task 1: Add discriminated `Question` and `Operation` types

**Files:**
- Modify: `src/lib/gameLogic.ts:1-21`

- [ ] **Step 1: Replace types block at top of `gameLogic.ts`**

Replace lines 1-21 with:

```ts
// Game logic utilities

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'questions' | 'time';
export type Operation = 'multiply' | 'divide' | 'square' | 'sqrt' | 'all';

export type BinaryOp = 'multiply' | 'divide';
export type UnaryOp = 'square' | 'sqrt';

export type BinaryQuestion = {
  kind: 'binary';
  op: BinaryOp;
  operand1: number;
  operand2: number;
  answer: number;
};

export type UnaryQuestion = {
  kind: 'unary';
  op: UnaryOp;
  operand: number;
  answer: number;
};

export type Question = BinaryQuestion | UnaryQuestion;

export interface GameSettings {
  tables: number[];
  difficulty: Difficulty;
  gameMode: GameMode;
  operation: Operation;
  questionCount: number;
  timeLimit: number; // in seconds
}
```

- [ ] **Step 2: Run typecheck (will fail in many places — that's expected; we proceed task by task)**

Run: `npx tsc --noEmit`
Expected: errors in `gameLogic.ts` (later tasks fix), `GamePlay.tsx`, `GameResults.tsx`, `Worksheet.tsx`, `worksheetPdf.ts`. Capture the count.

- [ ] **Step 3: Do NOT commit yet** — types and generator change atomically in next task.

---

## Task 2: Rewrite `generateQuestions` for all five operation modes (TDD)

**Files:**
- Modify: `src/lib/gameLogic.ts:23-68`
- Modify: `src/lib/gameLogic.test.ts` (rewrite to new shape)

- [ ] **Step 1: Write failing tests in `gameLogic.test.ts`**

Replace the entire file with:

```ts
import { describe, it, expect } from 'vitest';
import { generateQuestions, generateWrongAnswers, shuffleOptions } from './gameLogic';
import type { Question } from './gameLogic';

const isMultiply = (q: Question) => q.kind === 'binary' && q.op === 'multiply';
const isDivide = (q: Question) => q.kind === 'binary' && q.op === 'divide';
const isSquare = (q: Question) => q.kind === 'unary' && q.op === 'square';
const isSqrt = (q: Question) => q.kind === 'unary' && q.op === 'sqrt';

describe('generateQuestions — multiply', () => {
  it('emits only binary multiply questions', () => {
    const qs = generateQuestions([5], 20, 'multiply');
    expect(qs).toHaveLength(20);
    qs.forEach(q => expect(isMultiply(q)).toBe(true));
  });

  it('answers respect a × b = a*b across 0..12', () => {
    for (let t = 0; t <= 12; t++) {
      const qs = generateQuestions([t], 13, 'multiply');
      for (let i = 0; i <= 12; i++) {
        const q = qs.find(x => x.kind === 'binary' && x.operand1 === t && x.operand2 === i);
        if (q && q.kind === 'binary') expect(q.answer).toBe(t * i);
      }
    }
  });
});

describe('generateQuestions — divide', () => {
  it('emits only binary divide questions and never divides by zero', () => {
    const qs = generateQuestions([0, 1, 2, 3], 100, 'divide');
    qs.forEach(q => {
      expect(isDivide(q)).toBe(true);
      if (q.kind === 'binary') expect(q.operand2).not.toBe(0);
    });
  });

  it('answers respect (t × i) ÷ t = i', () => {
    for (let t = 1; t <= 12; t++) {
      const qs = generateQuestions([t], 50, 'divide');
      for (let i = 0; i <= 12; i++) {
        const q = qs.find(x => x.kind === 'binary' && x.operand1 === t * i && x.operand2 === t);
        if (q && q.kind === 'binary') expect(q.answer).toBe(i);
      }
    }
  });
});

describe('generateQuestions — square', () => {
  it('emits only unary square questions', () => {
    const qs = generateQuestions([2, 5, 7], 30, 'square');
    expect(qs).toHaveLength(30);
    qs.forEach(q => expect(isSquare(q)).toBe(true));
  });

  it('answers respect n² = n*n for selected tables', () => {
    const qs = generateQuestions([3, 7, 12], 30, 'square');
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'square') {
        expect(q.answer).toBe(q.operand * q.operand);
        expect([3, 7, 12]).toContain(q.operand);
      }
    });
  });
});

describe('generateQuestions — sqrt', () => {
  it('emits only unary sqrt questions', () => {
    const qs = generateQuestions([2, 5, 7], 30, 'sqrt');
    expect(qs).toHaveLength(30);
    qs.forEach(q => expect(isSqrt(q)).toBe(true));
  });

  it('answers respect √(n²) = n for selected tables', () => {
    const qs = generateQuestions([3, 7, 12], 30, 'sqrt');
    qs.forEach(q => {
      if (q.kind === 'unary' && q.op === 'sqrt') {
        expect(q.operand).toBe(q.answer * q.answer);
        expect([3, 7, 12]).toContain(q.answer);
      }
    });
  });
});

describe('generateQuestions — all', () => {
  it('mixes all four operations across enough samples', () => {
    const qs = generateQuestions([2, 3, 4, 5, 6, 7, 8, 9, 10], 200, 'all');
    expect(qs.some(isMultiply)).toBe(true);
    expect(qs.some(isDivide)).toBe(true);
    expect(qs.some(isSquare)).toBe(true);
    expect(qs.some(isSqrt)).toBe(true);
  });
});

describe('generateQuestions — count and tables empty handling', () => {
  it('returns the requested count', () => {
    expect(generateQuestions([5, 7], 20, 'multiply')).toHaveLength(20);
    expect(generateQuestions([5, 7], 7, 'multiply')).toHaveLength(7);
  });
});

describe('generateWrongAnswers', () => {
  it('returns 2 wrong answers different from correct, all non-negative', () => {
    const wrong = generateWrongAnswers(20, 'easy');
    expect(wrong).toHaveLength(2);
    wrong.forEach(w => {
      expect(w).not.toBe(20);
      expect(w).toBeGreaterThanOrEqual(0);
    });
    expect(wrong[0]).not.toBe(wrong[1]);
  });

  it('medium answers stay close to correct', () => {
    const wrong = generateWrongAnswers(50, 'medium');
    expect(wrong).toHaveLength(2);
    wrong.forEach(w => expect(Math.abs(w - 50)).toBeLessThanOrEqual(10));
  });
});

describe('shuffleOptions', () => {
  it('returns three options containing the correct value', () => {
    const opts = shuffleOptions(42, [40, 44]);
    expect(opts).toHaveLength(3);
    expect(opts).toContain(42);
    expect(opts).toContain(40);
    expect(opts).toContain(44);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail (compile errors against old generator are fine)**

Run: `npx vitest run src/lib/gameLogic.test.ts`
Expected: failures because the new test shape doesn't match the old generator output (or compile errors against the old `Question` interface).

- [ ] **Step 3: Replace `generateQuestions` in `gameLogic.ts` (lines 23-68 of original)**

```ts
function buildPool(tables: number[], operation: Exclude<Operation, 'all'>): Question[] {
  const pool: Question[] = [];
  if (operation === 'multiply') {
    for (const t of tables) {
      for (let i = 0; i <= 12; i++) {
        pool.push({ kind: 'binary', op: 'multiply', operand1: t, operand2: i, answer: t * i });
      }
    }
  } else if (operation === 'divide') {
    for (const t of tables) {
      if (t === 0) continue;
      for (let i = 0; i <= 12; i++) {
        pool.push({ kind: 'binary', op: 'divide', operand1: t * i, operand2: t, answer: i });
      }
    }
  } else if (operation === 'square') {
    for (const t of tables) {
      pool.push({ kind: 'unary', op: 'square', operand: t, answer: t * t });
    }
  } else if (operation === 'sqrt') {
    for (const t of tables) {
      pool.push({ kind: 'unary', op: 'sqrt', operand: t * t, answer: t });
    }
  }
  return pool;
}

export function generateQuestions(
  tables: number[],
  count: number,
  operation: Operation
): Question[] {
  const concreteOps: Exclude<Operation, 'all'>[] =
    operation === 'all' ? ['multiply', 'divide', 'square', 'sqrt'] : [operation];

  let allQuestions: Question[] = [];
  for (const op of concreteOps) {
    allQuestions = allQuestions.concat(buildPool(tables, op));
  }

  // Shuffle (Fisher-Yates would be nicer; preserving existing technique)
  allQuestions.sort(() => Math.random() - 0.5);

  if (allQuestions.length === 0) return [];

  const result: Question[] = [];
  while (result.length < count) {
    const remaining = count - result.length;
    result.push(...allQuestions.slice(0, Math.min(remaining, allQuestions.length)));
    if (result.length < count) {
      allQuestions.sort(() => Math.random() - 0.5);
    }
  }

  return result.slice(0, count);
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/lib/gameLogic.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameLogic.ts src/lib/gameLogic.test.ts
git commit -m "Add discriminated Question type and square/sqrt/all operations"
```

---

## Task 3: Add `QuestionDisplay` React component

**Files:**
- Create: `src/components/game/QuestionDisplay.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { Question } from '@/lib/gameLogic';

interface Props {
  q: Question;
  className?: string;
}

export function QuestionDisplay({ q, className }: Props) {
  if (q.kind === 'binary') {
    const sym = q.op === 'multiply' ? '×' : '÷';
    return (
      <span className={className}>
        {q.operand1} {sym} {q.operand2}
      </span>
    );
  }

  if (q.op === 'square') {
    return (
      <span className={className}>
        {q.operand}
        <sup className="text-[0.6em] relative -top-[0.4em] ml-0.5">2</sup>
      </span>
    );
  }

  // sqrt
  return (
    <span className={`inline-flex items-baseline ${className ?? ''}`}>
      <span className="text-[0.95em] leading-none">√</span>
      <span className="border-t-[0.12em] border-current pt-[0.05em] px-[0.1em]">
        {q.operand}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/components/game/QuestionDisplay.tsx`
Expected: no errors specific to this file (other unrelated errors elsewhere are OK).

- [ ] **Step 3: Commit**

```bash
git add src/components/game/QuestionDisplay.tsx
git commit -m "Add QuestionDisplay component for square/sqrt/binary rendering"
```

---

## Task 4: Update `gameStorage` — settings migration, key scheme, signatures (TDD)

**Files:**
- Create: `src/lib/gameStorage.test.ts`
- Modify: `src/lib/gameStorage.ts`

- [ ] **Step 1: Write failing tests in new file `src/lib/gameStorage.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedSettings,
  getSavedPrintSettings,
  getQuestionKey,
  recordAnswer,
  getProgress,
} from './gameStorage';
import type { Question } from './gameLogic';

beforeEach(() => {
  localStorage.clear();
});

describe('getSavedSettings migration', () => {
  it("rewrites legacy 'both' to 'all'", () => {
    localStorage.setItem(
      'maths-challenge-settings',
      JSON.stringify({
        tables: [1, 2],
        difficulty: 'medium',
        gameMode: 'time',
        operation: 'both',
        questionCount: 10,
        timeLimit: 180,
      })
    );
    const s = getSavedSettings();
    expect(s.operation).toBe('all');
  });

  it('passes through non-legacy values unchanged', () => {
    localStorage.setItem(
      'maths-challenge-settings',
      JSON.stringify({
        tables: [1],
        difficulty: 'easy',
        gameMode: 'questions',
        operation: 'square',
        questionCount: 5,
        timeLimit: 60,
      })
    );
    expect(getSavedSettings().operation).toBe('square');
  });
});

describe('getSavedPrintSettings migration', () => {
  it("rewrites legacy 'both' to 'all'", () => {
    localStorage.setItem(
      'maths-challenge-printSettings',
      JSON.stringify({ tables: [1], operation: 'both', questionCount: 40, pageCount: 1 })
    );
    expect(getSavedPrintSettings().operation).toBe('all');
  });
});

describe('getQuestionKey', () => {
  it('multiply uses NxN', () => {
    const q: Question = { kind: 'binary', op: 'multiply', operand1: 7, operand2: 8, answer: 56 };
    expect(getQuestionKey(q)).toBe('7x8');
  });

  it('divide uses NdN', () => {
    const q: Question = { kind: 'binary', op: 'divide', operand1: 56, operand2: 7, answer: 8 };
    expect(getQuestionKey(q)).toBe('56d7');
  });

  it('square uses Nsq', () => {
    const q: Question = { kind: 'unary', op: 'square', operand: 7, answer: 49 };
    expect(getQuestionKey(q)).toBe('7sq');
  });

  it('sqrt uses Nrt (radicand)', () => {
    const q: Question = { kind: 'unary', op: 'sqrt', operand: 49, answer: 7 };
    expect(getQuestionKey(q)).toBe('49rt');
  });
});

describe('recordAnswer', () => {
  it('increments timesCorrect for correct answers', () => {
    const q: Question = { kind: 'unary', op: 'square', operand: 7, answer: 49 };
    recordAnswer(q, true);
    recordAnswer(q, true);
    const progress = getProgress();
    expect(progress['7sq'].timesCorrect).toBe(2);
    expect(progress['7sq'].timesWrong).toBe(0);
  });

  it('increments timesWrong for incorrect answers', () => {
    const q: Question = { kind: 'unary', op: 'sqrt', operand: 49, answer: 7 };
    recordAnswer(q, false);
    expect(getProgress()['49rt'].timesWrong).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail (signature/key mismatch)**

Run: `npx vitest run src/lib/gameStorage.test.ts`
Expected: fail (recordAnswer signature differs, no migration).

- [ ] **Step 3: Update `gameStorage.ts`**

Replace the existing `getQuestionKey` (line 47-49) and `recordAnswer` (lines 51-78), and modify `getSavedSettings` (lines 147-158) and `getSavedPrintSettings` (lines 183-194).

Add at top of file (after existing imports if any):

```ts
import type { Question, BinaryOp, UnaryOp } from './gameLogic';
```

Replace `getQuestionKey` with:

```ts
export function getQuestionKey(q: Question): string {
  if (q.kind === 'binary') {
    const sep = q.op === 'multiply' ? 'x' : 'd';
    return `${q.operand1}${sep}${q.operand2}`;
  }
  const suffix = q.op === 'square' ? 'sq' : 'rt';
  return `${q.operand}${suffix}`;
}
```

Replace `recordAnswer` with:

```ts
export function recordAnswer(
  question: Question,
  correct: boolean,
  userId?: string
): void {
  const progress = getProgress(userId);
  const key = getQuestionKey(question);

  if (!progress[key]) {
    const base = {
      timesWrong: 0,
      timesCorrect: 0,
      lastAttempt: new Date().toISOString(),
    };
    if (question.kind === 'binary') {
      progress[key] = {
        ...base,
        op: question.op,
        multiplier: question.operand1,
        multiplicand: question.operand2,
      };
    } else {
      progress[key] = {
        ...base,
        op: question.op,
        multiplier: question.operand,
        multiplicand: question.answer,
      };
    }
  }

  if (correct) progress[key].timesCorrect++;
  else progress[key].timesWrong++;
  progress[key].lastAttempt = new Date().toISOString();

  saveProgress(progress, userId);
}
```

Update `QuestionRecord` interface (lines 3-9) to:

```ts
export interface QuestionRecord {
  multiplier: number;        // legacy field, retained
  multiplicand: number;      // legacy field, retained
  op?: BinaryOp | UnaryOp;   // populated for new entries
  timesWrong: number;
  timesCorrect: number;
  lastAttempt: string;
}
```

In `getSavedSettings`, after the `if (data) { return ... }` line, change to:

```ts
export function getSavedSettings(userId?: string): SavedSettings {
  try {
    const key = getStorageKey('settings', userId);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      if (parsed.operation === 'both') parsed.operation = 'all';
      return parsed;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
```

Same migration in `getSavedPrintSettings`:

```ts
export function getSavedPrintSettings(userId?: string): PrintSavedSettings {
  try {
    const key = getStorageKey('printSettings', userId);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(data) };
      if (parsed.operation === 'both') parsed.operation = 'all';
      return parsed;
    }
    return DEFAULT_PRINT_SETTINGS;
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/lib/gameStorage.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameStorage.ts src/lib/gameStorage.test.ts
git commit -m "Migrate operation 'both' to 'all' and extend recordAnswer to new ops"
```

---

## Task 5: Update `GamePlay.tsx` to use discriminated `Question` and `QuestionDisplay`

**Files:**
- Modify: `src/components/game/GamePlay.tsx`

- [ ] **Step 1: Update `GameResults` interface (lines 23-35)**

Replace with:

```tsx
export type GameResultIncorrect =
  | {
      kind: 'binary';
      op: 'multiply' | 'divide';
      operand1: number;
      operand2: number;
      userAnswer: number | null;
      correctAnswer: number;
    }
  | {
      kind: 'unary';
      op: 'square' | 'sqrt';
      operand: number;
      userAnswer: number | null;
      correctAnswer: number;
    };

export interface GameResults {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: GameResultIncorrect[];
  settings: GameSettings;
}
```

- [ ] **Step 2: Replace `getOperationSymbol` (line 55) and import `QuestionDisplay`**

Add import near the other imports:

```tsx
import { QuestionDisplay } from './QuestionDisplay';
```

Delete `getOperationSymbol` line entirely (no longer needed).

- [ ] **Step 3: Update `handleAnswer` (lines 112-162)**

Replace the body of `handleAnswer` with:

```tsx
const handleAnswer = useCallback((userAnswer: number | null) => {
  const currentQuestion = questions[currentIndex];
  const isCorrect = userAnswer === currentQuestion.answer;

  setQuestionsAnswered(prev => prev + 1);
  recordAnswer(currentQuestion, isCorrect, userId);

  if (isCorrect) {
    setScore(prev => prev + 1);
    setStreak(prev => {
      const next = prev + 1;
      setBestStreak(b => Math.max(b, next));
      return next;
    });
    setFeedback('correct');
    setFeedbackMessage(getRandomPositiveMessage());
  } else {
    setStreak(0);
    setFeedback('incorrect');
    // Feedback message rendered via QuestionDisplay below — set to '' (unused).
    setFeedbackMessage('');
    if (currentQuestion.kind === 'binary') {
      setIncorrectQuestions(prev => [
        ...prev,
        {
          kind: 'binary',
          op: currentQuestion.op,
          operand1: currentQuestion.operand1,
          operand2: currentQuestion.operand2,
          userAnswer,
          correctAnswer: currentQuestion.answer,
        },
      ]);
    } else {
      setIncorrectQuestions(prev => [
        ...prev,
        {
          kind: 'unary',
          op: currentQuestion.op,
          operand: currentQuestion.operand,
          userAnswer,
          correctAnswer: currentQuestion.answer,
        },
      ]);
    }
  }

  const delay = isCorrect ? 800 : 1400;
  setTimeout(() => {
    setFeedback('none');
    const nextIndex = currentIndex + 1;
    if (settings.gameMode === 'questions' && nextIndex >= settings.questionCount) {
      setIsComplete(true);
    } else if (nextIndex >= questions.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, delay);
}, [currentIndex, questions, settings, userId]);
```

- [ ] **Step 4: Update the question render block (lines 178-267, both `feedback === 'none'` and feedback states)**

Replace the question card block with:

```tsx
const currentQuestion = questions[currentIndex];
const progress = settings.gameMode === 'questions'
  ? (currentIndex / settings.questionCount) * 100
  : ((settings.timeLimit - timeLeft) / settings.timeLimit) * 100;
```

(remove the `const symbol = getOperationSymbol(...)` line.)

Inside the JSX, replace the two `{currentQuestion.operand1} {symbol} {currentQuestion.operand2}` lines with:

```tsx
// In the active question display
<div className="mb-1 md:mb-2 text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground">
  <QuestionDisplay q={currentQuestion} />
</div>
```

And in the incorrect-feedback display:

```tsx
<div className="text-3xl md:text-4xl font-bold text-foreground">
  <QuestionDisplay q={currentQuestion} /> = {currentQuestion.answer}
</div>
```

Replace the correct-feedback message block:

```tsx
{feedback === 'correct' ? (
  <>{feedbackMessage}</>
) : (
  <>Not quite!</>
)}
```

(remove references to `feedbackMessage` carrying the equation string.)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in remaining files (`GameResults.tsx`, `Worksheet.tsx`, `worksheetPdf.ts`, `GameSetup.tsx`, `PrintResources.tsx`).

- [ ] **Step 6: Commit**

```bash
git add src/components/game/GamePlay.tsx
git commit -m "Use QuestionDisplay and discriminated incorrectQuestions in GamePlay"
```

---

## Task 6: Update `GameResults.tsx` to render new `incorrectQuestions` shape

**Files:**
- Modify: `src/components/game/GameResults.tsx`

- [ ] **Step 1: Remove `getSymbol` (line 17) and add imports**

```tsx
import { QuestionDisplay } from './QuestionDisplay';
import type { Question } from '@/lib/gameLogic';
```

Delete the `getSymbol` line.

- [ ] **Step 2: Replace `useEffect` body (lines 55-99)**

Replace with:

```tsx
useEffect(() => {
  // Save session — flatten new incorrectQuestions to legacy multiplier/multiplicand fields
  saveSession({
    date: new Date().toISOString(),
    score: results.score,
    total: results.total,
    difficulty: results.settings.difficulty,
    tables: results.settings.tables,
    incorrectQuestions: results.incorrectQuestions.map(q => {
      if (q.kind === 'binary') {
        return {
          multiplier: q.operand1,
          multiplicand: q.operand2,
          userAnswer: q.userAnswer,
          correctAnswer: q.correctAnswer,
        };
      }
      return {
        multiplier: q.operand,
        multiplicand: q.correctAnswer,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
      };
    }),
  }, userId);

  // Surface improvements / still-challenging based on multiply only (legacy keys)
  const progress = getProgress(userId);
  const improvedList: string[] = [];
  const challengingList: string[] = [];

  results.incorrectQuestions.forEach(q => {
    if (q.kind !== 'binary' || q.op !== 'multiply') return;
    const key = getQuestionKey({
      kind: 'binary',
      op: 'multiply',
      operand1: q.operand1,
      operand2: q.operand2,
      answer: q.correctAnswer,
    });
    const record = progress[key];
    if (record && record.timesWrong > 1) {
      challengingList.push(`${q.operand1} × ${q.operand2}`);
    }
  });

  Object.values(progress).forEach(record => {
    if (record.op && record.op !== 'multiply') return;
    if (record.timesWrong > 0 && record.timesCorrect > 0) {
      const wasWrongThisSession = results.incorrectQuestions.some(
        q =>
          q.kind === 'binary' &&
          q.op === 'multiply' &&
          q.operand1 === record.multiplier &&
          q.operand2 === record.multiplicand
      );
      if (!wasWrongThisSession && results.settings.tables.includes(record.multiplier)) {
        improvedList.push(`${record.multiplier} × ${record.multiplicand}`);
      }
    }
  });

  setImproved(improvedList.slice(0, 5));
  setStillChallenging(challengingList);
}, [results, userId]);
```

- [ ] **Step 3: Replace incorrect-questions render (lines 156-181)**

```tsx
{/* Incorrect Questions */}
{results.incorrectQuestions.length > 0 && (
  <Card className="mb-4 p-4">
    <h3 className="mb-3 font-bold text-foreground">Questions to practise:</h3>
    <div className="space-y-2">
      {results.incorrectQuestions.map((q, idx) => {
        const asQuestion: Question =
          q.kind === 'binary'
            ? { kind: 'binary', op: q.op, operand1: q.operand1, operand2: q.operand2, answer: q.correctAnswer }
            : { kind: 'unary', op: q.op, operand: q.operand, answer: q.correctAnswer };
        return (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg bg-muted px-4 py-2"
          >
            <span className="font-medium">
              <QuestionDisplay q={asQuestion} /> = {q.correctAnswer}
            </span>
            {q.userAnswer !== null && (
              <span className="text-sm text-destructive">
                You said: {q.userAnswer}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </Card>
)}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors remaining only in `GameSetup.tsx`, `PrintResources.tsx`, `Worksheet.tsx`, `worksheetPdf.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/GameResults.tsx
git commit -m "Render new discriminated incorrectQuestions in GameResults"
```

---

## Task 7: Update `GameSetup.tsx` operation picker to 5 buttons

**Files:**
- Modify: `src/components/game/GameSetup.tsx:328-352`

- [ ] **Step 1: Replace the operation `<Card>` block (lines 328-352)**

```tsx
{/* Operation */}
<Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
  <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Operation</h2>
  <div className="grid grid-cols-5 gap-1 md:gap-2">
    {([
      { id: 'multiply', label: '×' },
      { id: 'divide',   label: '÷' },
      { id: 'square',   label: 'x²' },
      { id: 'sqrt',     label: '√' },
      { id: 'all',      label: 'All' },
    ] as const).map(op => (
      <button
        key={op.id}
        onClick={() => setOperation(op.id)}
        className={cn(
          'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
          'hover:scale-[1.02] active:scale-[0.98]',
          operation === op.id
            ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
            : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
        )}
      >
        <span className="text-[15px] md:text-[18px]">{op.label}</span>
      </button>
    ))}
  </div>
</Card>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: only `Worksheet.tsx`, `worksheetPdf.ts`, `PrintResources.tsx` remain.

- [ ] **Step 3: Commit**

```bash
git add src/components/game/GameSetup.tsx
git commit -m "Add square/sqrt/all buttons to GameSetup operation picker"
```

---

## Task 8: Update `PrintResources.tsx` operation picker to 5 buttons

**Files:**
- Modify: `src/pages/PrintResources.tsx:13` (Operation type) and lines 179-203 (picker)

- [ ] **Step 1: Update the local `Operation` type alias (line 13)**

Change:

```ts
type Operation = 'multiply' | 'divide' | 'both';
```

to:

```ts
type Operation = 'multiply' | 'divide' | 'square' | 'sqrt' | 'all';
```

- [ ] **Step 2: Replace the Operation `<Card>` (lines 179-203)**

```tsx
{/* Operation */}
<Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
  <h2 className={cn("mb-2 md:mb-3 font-semibold text-foreground", setupTypography.cardHeading)}>Operation</h2>
  <div className="grid grid-cols-5 gap-1 md:gap-2">
    {([
      { id: 'multiply', label: '×' },
      { id: 'divide',   label: '÷' },
      { id: 'square',   label: 'x²' },
      { id: 'sqrt',     label: '√' },
      { id: 'all',      label: 'All' },
    ] as const).map(op => (
      <button
        key={op.id}
        onClick={() => setOperation(op.id)}
        className={cn(
          'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
          'hover:scale-[1.02] active:scale-[0.98]',
          operation === op.id
            ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
            : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
        )}
      >
        <span className="text-[15px] md:text-[18px]">{op.label}</span>
      </button>
    ))}
  </div>
</Card>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: only `Worksheet.tsx` and `worksheetPdf.ts` remain.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PrintResources.tsx
git commit -m "Add square/sqrt/all buttons to PrintResources operation picker"
```

---

## Task 9: Update `Worksheet.tsx` — drop duplicate generator, use `QuestionDisplay`, extend label

**Files:**
- Modify: `src/components/Worksheet.tsx`

- [ ] **Step 1: Update prop types and imports (lines 1-19)**

Replace the imports and `WorksheetProps` / local `Question` declarations with:

```tsx
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { getWorksheetPrintFontSize } from '@/lib/typography';
import { generateWorksheetPdf } from '@/lib/worksheetPdf';
import { generateQuestions } from '@/lib/gameLogic';
import type { Operation, Question } from '@/lib/gameLogic';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';

interface WorksheetProps {
  tables: number[];
  operation: Operation;
  questionCount: number;
  pageCount?: number;
  studentName?: string;
  onBack: () => void;
}
```

- [ ] **Step 2: Delete the local `generateQuestions` (lines 39-98)** — it's replaced by the import.

- [ ] **Step 3: Update `tableSuffix` building (around line 124)**

Replace:

```tsx
const tableSuffix = operation === 'divide' ? '÷' : operation === 'both' ? '×÷' : '×';
const tablesLabel = sortedTables.map(t => `${t}${tableSuffix}`).join(', ');
```

with:

```tsx
const opLabelSuffix: Record<Operation, string> = {
  multiply: '×',
  divide: '÷',
  square: '²',
  sqrt: '√',
  all: '×÷²√',
};
const tableSuffix = opLabelSuffix[operation];
const tablesLabel = sortedTables.map(t => `${t}${tableSuffix}`).join(', ');
```

- [ ] **Step 4: Replace `getSymbol` (line 137) and the question render (lines 333-337)**

Delete `getSymbol`. Replace the questions-grid render block with:

```tsx
<div className="questions-grid">
  {previewQuestions.map((q, idx) => (
    <div key={idx} className="question text-sm">
      <QuestionDisplay q={q} /> =<span className="answer-blank">&nbsp;</span>
    </div>
  ))}
</div>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: only `worksheetPdf.ts` remains.

- [ ] **Step 6: Commit**

```bash
git add src/components/Worksheet.tsx
git commit -m "Reuse generateQuestions and QuestionDisplay in Worksheet preview"
```

---

## Task 10: Update `worksheetPdf.ts` — discriminated `PdfQuestion`, draw radical via lines

**Files:**
- Modify: `src/lib/worksheetPdf.ts`

- [ ] **Step 1: Replace `PdfQuestion` (lines 3-7)**

```ts
import jsPDF from 'jspdf';
import type { Question } from './gameLogic';

export type PdfQuestion = Question;
```

- [ ] **Step 2: Replace the question loop in `drawPage` (lines 82-99)**

```ts
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const col = i % cols;
  const row = Math.floor(i / cols);
  const cellX = left + col * colW;
  const cellCenterY = gridTop + row * rowH + rowH / 2;
  const baselineY = cellCenterY + (fs * 0.352778) * 0.35;

  let eqEndX: number;

  if (q.kind === 'binary') {
    const symbol = q.op === 'multiply' ? '×' : '÷';
    const eq = `${q.operand1} ${symbol} ${q.operand2} =`;
    doc.text(eq, cellX + 1, baselineY);
    eqEndX = cellX + 1 + doc.getTextWidth(eq);
  } else if (q.op === 'square') {
    const baseStr = `${q.operand}`;
    doc.text(baseStr, cellX + 1, baselineY);
    const baseW = doc.getTextWidth(baseStr);
    const supSize = fs * 0.6;
    doc.setFontSize(supSize);
    doc.text('2', cellX + 1 + baseW + 0.4, baselineY - fs * 0.3);
    const supW = doc.getTextWidth('2');
    doc.setFontSize(fs);
    const eqStr = ' =';
    doc.text(eqStr, cellX + 1 + baseW + 0.4 + supW + 0.5, baselineY);
    eqEndX = cellX + 1 + baseW + 0.4 + supW + 0.5 + doc.getTextWidth(eqStr);
  } else {
    // sqrt — draw radical with line primitives, then radicand under overbar
    const radicandStr = `${q.operand}`;
    const radicandW = doc.getTextWidth(radicandStr);
    const hookHeight = fs * 0.4;
    const hookWidth = fs * 0.18;
    const overbarPadding = 0.6;

    const hookBottomX = cellX + 1;
    const hookBottomY = baselineY;
    const hookTopX = hookBottomX + hookWidth;
    const hookTopY = baselineY - hookHeight;
    const overbarStartX = hookTopX;
    const overbarEndX = hookTopX + radicandW + overbarPadding * 2;
    const overbarY = hookTopY;

    doc.setLineWidth(0.3);
    doc.line(hookBottomX, hookBottomY, hookTopX, hookTopY);
    doc.line(overbarStartX, overbarY, overbarEndX, overbarY);

    doc.text(radicandStr, hookTopX + overbarPadding, baselineY);
    const eqStr = ' =';
    doc.text(eqStr, overbarEndX + 0.5, baselineY);
    eqEndX = overbarEndX + 0.5 + doc.getTextWidth(eqStr);
  }

  const blankStart = eqEndX + 1.5;
  const blankEnd = Math.min(cellX + colW - 1, blankStart + 10);
  if (blankEnd > blankStart) {
    doc.setLineWidth(0.3);
    doc.line(blankStart, baselineY + 0.6, blankEnd, baselineY + 0.6);
  }
}
```

- [ ] **Step 3: Typecheck whole project**

Run: `npx tsc --noEmit`
Expected: clean (zero errors).

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/worksheetPdf.ts
git commit -m "Render square superscript and sqrt radical in PDF via primitives"
```

---

## Task 11: Manual smoke test

**Files:** none modified.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Open the URL printed in the terminal (typically http://localhost:5173).

- [ ] **Step 2: Verify game flow per operation**

For each of `multiply`, `divide`, `square`, `sqrt`, `all`:
- Pick a few tables (e.g. 3, 7, 12)
- Each of three difficulties (easy, medium, hard)
- Confirm question card renders correctly: `7 × 8`, `56 ÷ 7`, `7²` (proper superscript), `√49` (overline above radicand)
- Confirm a wrong answer shows the correct equation and the next question advances

- [ ] **Step 3: Verify worksheet preview and PDF**

For each operation, click Print Worksheets in the menu, choose tables, count = 40, click Generate.
- Screen preview must render `7²` and `√49` correctly
- Click Download PDF; open the saved file and verify the radical (line+overbar) and superscript print clean at 40, 80, and 100 questions per page

- [ ] **Step 4: Verify migration**

In browser devtools, set localStorage:

```js
localStorage.setItem('maths-challenge-settings', JSON.stringify({
  tables:[1,2], difficulty:'medium', gameMode:'time',
  operation:'both', questionCount:10, timeLimit:180
}));
```

Reload. The Operation picker must show "All" highlighted.

- [ ] **Step 5: Commit nothing (manual checks only)**

If any check fails, return to the relevant Task above and fix.

---

## Self-Review Notes

Spec coverage check:

| Spec section | Task |
|--------------|------|
| Type changes | 1 |
| Generator consolidation | 2, 9 |
| Render component | 3 |
| Setup UI | 7, 8 |
| Storage migration & key scheme | 4 |
| PDF render | 10 |
| GameResults shape | 5, 6 |
| Testing (unit) | 2, 4 |
| Testing (manual) | 11 |

No `TBD` / `TODO`. All function signatures used in later tasks defined in earlier tasks (`Question`, `recordAnswer(question, correct)`, `getQuestionKey(q)`, `QuestionDisplay`).
