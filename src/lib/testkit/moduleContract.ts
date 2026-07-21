// One normalised surface over the heterogeneous module `logic.ts` exports, so
// generic regression tests (answer-integrity, e2e auto-player) can drive every
// module without knowing each module's bespoke generate/grade/choices names.
//
// Adapters live in `./modules/<slug>.ts` and are collected in `./registry.ts`.
// An adapter is wiring only — it calls existing `logic.ts` exports and contains
// no test logic of its own.
export interface PlayableModule<S, Q> {
  /** Hub slug, e.g. 'charts'. */
  slug: string;
  /** Every skill/operation a user can select. */
  skills: string[];
  /** Single-skill settings mirroring the module's DEFAULT_SETTINGS. */
  settingsFor(skill: string): S;
  /** Generate `count` questions for the given settings. */
  generate(settings: S, count: number): Q[];
  /** Canonical correct-answer string a knowing player would enter or pick. */
  correctAnswer(q: Q): string;
  /** Grade a candidate answer string exactly as the Play component does. */
  isCorrect(q: Q, answer: string): boolean;
  /** Buttons shown for this question; [] when the skill uses typed input. */
  choices(q: Q): string[];
  /** Indices whose value the renderer must NOT print (answer give-aways). */
  hiddenValueIndices?(q: Q): number[];
}
