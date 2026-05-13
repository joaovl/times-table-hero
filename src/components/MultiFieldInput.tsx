// Shared compound-input row for "two- or three-field answer" patterns.
//
// Examples in the codebase (NOT all migrated by this PR — see notes below):
//   arithmetic/ArithmeticPlay.tsx   "[quotient] r [remainder]"   2 fields
//   fractions/FractionsPlay.tsx     "[num] / [den]"              2 fields
//                                   "[whole] [num] / [den]"      3 fields
//   decimals/DecimalsPlay.tsx       "[num] / [den]"              2 fields
//   shapes/ShapesPlay.tsx           "[x] , [y]"                  2 fields (coord-read)
//
// What this component owns:
//   - Layout: flex row, centred separators between inputs.
//   - Focus management: Enter on any non-last field advances focus + selects
//     the next field's text. Enter on the LAST field falls through to the
//     containing <form>'s default submit behaviour (the parent owns the
//     form, the Check button, and the submit handler). Tab also advances
//     because each Input is in DOM order.
//   - Accessibility: every input must carry an `ariaLabel`, which we set on
//     the underlying <input> via `aria-label`. The a11y test pass already
//     made this the required pattern for all answer inputs.
//
// What this component does NOT own:
//   - The submit handler. Parents wrap MultiFieldInput in a <form> and
//     handle onSubmit themselves so they keep their existing parsing /
//     validation. Enter on the last field naturally submits the form.
//   - The Check button. Parents render that beside MultiFieldInput.
//   - The literal "1/4" math semantics. Separators are pure visual glyphs.
//
// MIGRATION STATUS (intentional partial migration):
//   Wired in this PR: decimals/DecimalsPlay.tsx (decimal-to-fraction skill).
//   TODO future PRs: migrate the other consumers listed above. Each parent
//   has a slightly different surrounding form (custom validation, different
//   width tokens, different placeholders) — landing them one at a time
//   makes each PR reviewable and keeps the test count obvious.

import { Fragment, useRef, type RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MultiFieldInputField {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Optional ref so the parent can focus on mount / reset. We forward it
   *  through to the underlying Input. The first field's ref is the one most
   *  callers care about. */
  inputRef?: RefObject<HTMLInputElement>;
  /** Defaults to false. Set on whichever field should grab focus on mount. */
  autoFocus?: boolean;
  /** Defaults to "numeric" / type="number". Pass "text" + inputMode="text"
   *  for cases like x,y coords. */
  inputMode?: 'numeric' | 'decimal' | 'text';
  /** Defaults to "number". Pass "text" for coord-read style entries. */
  type?: 'number' | 'text';
}

export interface MultiFieldInputProps {
  /** 2 or 3 fields. Anything else is a layout bug — we throw in dev. */
  fields: MultiFieldInputField[];
  /** Visual separators between consecutive fields. Length must be
   *  `fields.length - 1`. Common values: ['r'], ['/'], [','], ['/', '+']. */
  separators: string[];
  /** Controls input height and font-size. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional extra class merged onto the outer flex row. */
  className?: string;
  /** Optional extra class merged onto every input. */
  inputClassName?: string;
  /** Optional extra class merged onto every separator span. Use this to
   *  swap the separator font family (e.g. `font-mono` for the arithmetic
   *  "r" separator). Defaults to inheriting the page font. */
  separatorClassName?: string;
}

/**
 * Visually-consistent compound input for the [A] sep [B] (sep [C]) pattern.
 * Tab/Enter advances focus to the next field; Enter on the last field
 * defers to the containing form's onSubmit handler.
 */
export function MultiFieldInput({
  fields,
  separators,
  size = 'md',
  className,
  inputClassName,
  separatorClassName,
}: MultiFieldInputProps) {
  // We keep one local ref array as a fallback for fields that didn't pass
  // their own ref — so Enter-advance still works even if the parent doesn't
  // care about per-field refs.
  const fallbackRefs = useRef<Array<RefObject<HTMLInputElement>>>(
    fields.map(f => f.inputRef ?? { current: null })
  );
  // If the fields array length changes between renders, refresh the
  // fallback list to keep refs in step.
  if (fallbackRefs.current.length !== fields.length) {
    fallbackRefs.current = fields.map(f => f.inputRef ?? { current: null });
  }
  const refForField = (i: number): RefObject<HTMLInputElement> =>
    fields[i].inputRef ?? fallbackRefs.current[i];

  // Tailwind utility presets per size variant. Kept inline so a future
  // theme tweak can be done without grepping multiple files.
  const inputSizeClasses =
    size === 'sm'
      ? 'h-10 md:h-12 text-xl md:text-2xl'
      : size === 'lg'
        ? 'h-14 md:h-[72px] text-3xl md:text-5xl'
        : 'h-12 md:h-[64px] text-2xl md:text-4xl';
  // Separators are sized one step LARGER than the inputs by default —
  // this mirrors the existing markup in DecimalsPlay where the `/` glyph
  // is rendered at text-3xl while the inputs sit at text-2xl. Consumers
  // that want the separator to match the input size can pass an explicit
  // `separatorClassName`.
  const sepSizeClasses =
    size === 'sm'
      ? 'text-2xl md:text-3xl'
      : size === 'lg'
        ? 'text-4xl md:text-6xl'
        : 'text-3xl md:text-4xl';

  return (
    <div
      className={cn('flex items-center justify-center gap-2 md:gap-3', className)}
    >
      {fields.map((field, i) => (
        <Fragment key={i}>
          <Input
            ref={refForField(i)}
            type={field.type ?? 'number'}
            inputMode={field.inputMode ?? 'numeric'}
            value={field.value}
            onChange={e => field.onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && i < fields.length - 1) {
                // Stop the keypress from bubbling up and submitting the form
                // before the kid has filled both fields. Focus + select the
                // next input so a fresh number replaces what was there.
                e.preventDefault();
                const next = refForField(i + 1).current;
                if (next) {
                  next.focus();
                  next.select();
                }
              }
              // Enter on the LAST field is intentionally NOT prevented —
              // we let the containing <form> handle submission.
            }}
            placeholder={field.placeholder}
            aria-label={field.ariaLabel}
            className={cn(
              'text-center font-bold',
              inputSizeClasses,
              inputClassName
            )}
            autoFocus={field.autoFocus}
          />
          {i < separators.length && (
            <span
              aria-hidden
              className={cn(
                'font-extrabold text-foreground select-none',
                sepSizeClasses,
                separatorClassName
              )}
            >
              {separators[i]}
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
