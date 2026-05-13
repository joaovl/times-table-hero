// Shared layout component for "play" screens that show a question inside a
// Card, optionally with a figure (SVG), a prompt line, and feedback for the
// last answer. The header above (quit / score / progress) and the answer-form
// area below the card are NOT this component's responsibility — callers
// continue to own those because their shape varies per module.
//
// Behaviour intentionally mirrors the existing inline Card pattern in
// `src/modules/arithmetic/ArithmeticPlay.tsx`:
//   - feedback === 'correct'   → `animate-pop bg-success/10` + "Brilliant!"
//   - feedback === 'incorrect' → `animate-shake bg-destructive/10` + the hint
//   - feedback === 'none'      → plain card, children visible below
// The "Brilliant!" copy is rendered here (not passed in) so every consumer
// gets the same positive feedback text. The wrong-answer hint comes from the
// `correctAnswerHint` prop so consumers can format it however they like
// (e.g. "= 42", "9/16", "obtuse").
//
// Children render below the card — they are the answer input form / buttons.
// The card's default padding matches arithmetic (`py-6 md:py-10`). A
// consumer that needs a tighter card (e.g. shapes, which has a tall SVG
// figure already inside the card) can override the inner padding via
// `cardClassName` — `cn()` lets later utilities win, so passing
// `cardClassName="py-4 md:py-6"` swaps the y padding without changing
// anything else.
//
// MIGRATION STATUS (intentional partial migration):
//   Wired in this PR: shapes/ShapesPlay.tsx, number-theory/NumberTheoryPlay.tsx
//   Future PRs should migrate the remaining 10 play screens incrementally,
//   one module per PR. The reason for going slowly is that each play screen
//   has subtly different feedback copy / padding / extra slots in the card
//   (e.g. arithmetic's two-display variants, money's currency strip, charts'
//   data table). Migrating all 12 in one go risks invisible behavioural
//   drift that the snapshot suite cannot catch. A per-module migration
//   keeps each diff reviewable.

import { Fragment, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type VisualQuestionFeedback = 'none' | 'correct' | 'incorrect';

export interface VisualQuestionProps {
  /** Optional figure (SVG) shown at the top of the card. Pass null/undefined
   *  for skills with no figure (e.g. pure arithmetic prompts). */
  figure?: ReactNode;
  /** The question text. Sits beneath the figure (or alone if no figure). */
  promptText?: ReactNode;
  /** Drives the card animation and which feedback message renders. */
  feedback: VisualQuestionFeedback;
  /** Rendered on an incorrect answer, e.g. "= 42" or "9/16". */
  correctAnswerHint?: ReactNode;
  /** The input form / button grid that goes BELOW the card. May be null. */
  children?: ReactNode;
  /** Optional extra class on the outer wrapper. When provided we emit a
   *  wrapping <div>; when omitted we render as a Fragment so the component
   *  is DOM-transparent — Card and children become direct siblings of
   *  whatever the parent layout had. This matters: callers that previously
   *  rendered <Card>...</Card> followed by <form>...</form> as siblings of
   *  a header bar can drop in VisualQuestion without affecting CSS that
   *  targets direct-child selectors. */
  className?: string;
  /** Optional extra class merged onto the inner Card. Useful to override
   *  padding (e.g. `py-4 md:py-6`) without touching the rest of the layout. */
  cardClassName?: string;
}

export function VisualQuestion({
  figure,
  promptText,
  feedback,
  correctAnswerHint,
  children,
  className,
  cardClassName,
}: VisualQuestionProps) {
  const Wrapper = className ? 'div' : Fragment;
  const wrapperProps = className ? { className } : {};
  return (
    <Wrapper {...wrapperProps}>
      <Card
        className={cn(
          'mb-3 md:mb-[19px] py-6 md:py-10 px-4 md:px-8 text-center shadow-card transition-all',
          feedback === 'correct' && 'animate-pop bg-success/10',
          feedback === 'incorrect' && 'animate-shake bg-destructive/10',
          cardClassName
        )}
      >
        {figure != null && (
          <div className="flex justify-center text-foreground">{figure}</div>
        )}
        {promptText != null && (
          <div className={figure != null ? 'mt-3' : undefined}>{promptText}</div>
        )}
        {feedback === 'incorrect' && correctAnswerHint != null && (
          <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
            {correctAnswerHint}
          </div>
        )}
        {feedback === 'correct' && (
          <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">
            Brilliant!
          </div>
        )}
      </Card>
      {children}
    </Wrapper>
  );
}
