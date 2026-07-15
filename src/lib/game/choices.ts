// Shared helpers for building multiple-choice answer options.
//
// Rule across the app: on `easy` and `medium` a child picks from a few value
// buttons; on `hard` they type the answer. Each module supplies the correct
// answer string plus plausible distractor strings; these helpers assemble and
// shuffle the final option list so exactly one option is correct.

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distinct integer distractors near `correct`. `spread` is the largest offset;
// results are kept >= 0 and never equal to `correct`.
export function numberDistractors(correct: number, count: number, spread: number): number[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < count && guard < 400) {
    guard++;
    const offset = 1 + Math.floor(Math.random() * Math.max(1, spread));
    const sign = Math.random() < 0.5 ? -1 : 1;
    let w = correct + offset * sign;
    if (w < 0) w = correct + offset;
    if (w !== correct) out.add(w);
  }
  return [...out];
}

// How far apart distractors should sit, by difficulty. Easy = obviously
// different, medium = close (harder to eyeball).
export function spreadFor(difficulty: 'easy' | 'medium' | 'hard'): number {
  return difficulty === 'easy' ? 9 : 3;
}

// Build integer options from a canonical answer string that is a single plain
// integer (optionally unit/symbol-wrapped via `format`). Returns [] when the
// answer isn't a lone integer, so the caller falls back to a typed input.
// `isWrong` uses the module's own grader so exactly one option is correct.
export function integerChoices(
  answer: number,
  difficulty: 'easy' | 'medium' | 'hard',
  isWrong: (candidate: string) => boolean,
  format: (n: number) => string = String,
): string[] {
  const correct = format(answer);
  // Guard: if the module grader wouldn't accept our own canonical answer
  // string (e.g. it needs a unit or currency prefix), bail so the caller
  // falls back to a typed input rather than showing an unwinnable question.
  if (isWrong(correct)) return [];
  const ds = numberDistractors(answer, 6, spreadFor(difficulty)).map(format).filter(isWrong);
  // Need at least one real distractor, else there'd be a single button.
  if (ds.length === 0) return [];
  return buildChoices(correct, ds, 3);
}

// Sentinel option shown on medium so a child can't win by elimination: it is
// the correct pick when the true answer isn't among the numeric buttons.
export const NONE_OF_THESE = 'None of these';

// Medium numeric options with a "None of these" button. When `hideCorrect` is
// true the true answer is omitted, so NONE_OF_THESE is the correct pick — this
// forces a child to actually compute rather than eyeball the buttons. Returns
// [] (caller falls back to a typed input) when the grader won't accept the
// canonical integer string, or when there aren't enough distractors.
export function numericChoicesWithNone(
  answer: number,
  isWrong: (candidate: string) => boolean,
  format: (n: number) => string = String,
  hideCorrect = false,
  spread: number = spreadFor('medium'),
): string[] {
  const correct = format(answer);
  if (isWrong(correct)) return [];
  const distractors = numberDistractors(answer, 6, spread).map(format).filter(isWrong);
  if (distractors.length === 0) return [];
  const opts =
    hideCorrect && distractors.length >= 3
      ? distractors.slice(0, 3)
      : [correct, ...distractors.slice(0, 2)];
  return shuffle([...opts, NONE_OF_THESE]);
}

// Uniform grader for a chosen multiple-choice option. NONE_OF_THESE is correct
// exactly when every other shown option is wrong (the true answer was hidden);
// any other option is graded by the module's own `isWrong`.
export function isChoiceCorrect(
  chosen: string,
  options: string[],
  isWrong: (candidate: string) => boolean,
): boolean {
  if (chosen === NONE_OF_THESE) {
    return options.every(o => o === NONE_OF_THESE || isWrong(o));
  }
  return !isWrong(chosen);
}

// Assemble the final, shuffled option list: the correct string plus the first
// distinct distractors, up to `total` options. Distractors equal to the
// correct string (or to each other) are dropped, guaranteeing one correct pick.
export function buildChoices(correct: string, distractors: string[], total = 3): string[] {
  const seen = new Set<string>([correct]);
  const opts = [correct];
  for (const d of distractors) {
    if (opts.length >= total) break;
    if (!seen.has(d)) {
      seen.add(d);
      opts.push(d);
    }
  }
  return shuffle(opts);
}
