# GUI Functional Test Suite — Design

Date: 2026-07-16
Status: Approved (design); pending implementation plan

## Motivation

Four user-reported bugs reached production because nothing exercised the app
from a real user's point of view:

- **#7 / #8** — Fractions served the same question over and over (small
  skill/denominator spaces, no anti-repetition).
- **#9** — An equivalent-but-unsimplified answer (`10/16` for `5/8`) was marked
  wrong instead of accepted.
- **#10** — Charts highlighted the exact bar/point the question asked about,
  handing over the answer.
- **#5** — Reward-rules save failed with an opaque "Could not save." and no
  actionable reason.

Unit tests (1841 of them) did not catch these because they test pure logic, not
the assembled UI a child actually uses. This suite closes that gap with real
browser, real-stack, user-POV automation — and grows into exhaustive per-option
coverage plus accessibility, responsive, and internationalization checks so the
project is dependable for kids worldwide.

## Principles

1. **User point of view.** Tests click, type, and read the screen exactly as a
   child or parent would. The only non-user input is a hidden *answer oracle*
   used purely to know the correct move (see below); interaction is always via
   the real UI.
2. **No clues, only clarity.** A cross-cutting assertion: the UI never reveals
   the answer (no highlighted target element except where the prompt explicitly
   refers to it, e.g. pie-fraction; the answer never appears in the visible
   DOM). This is bug #10 generalized into a permanent invariant.
3. **Bulletproof over broad-but-flaky.** Determinism via a test-only oracle and
   collapsed animation delays; each option tested *in isolation* rather than a
   flaky cartesian explosion.
4. **Open source ergonomics.** Documented harness and a "cover a new module"
   recipe so external contributors can extend coverage.

## Foundation (existing, reused)

Playwright real-stack setup already exists and is reused as-is:

- `playwright.config.ts` — headless Chromium, `baseURL http://127.0.0.1:8788`,
  `webServer` runs `npm run e2e:server` (`npm run build` + `wrangler d1
  migrations apply --local` + `wrangler pages dev`). Nothing is mocked: browser
  → fetch → Pages Functions → D1.
- `e2e/` — existing parent-flow specs (`parent-journey`, `link-and-focus`,
  `reward-balance`, `two-kids-isolation`). Conventions: `getByRole`,
  `getByLabel`, `getByText`; serial; `PWSLOW` for headed debugging.

New work extends this; it does not replace it.

## Component 1 — The test-only answer oracle

**File:** `src/lib/e2e/oracle.tsx`

- `export const E2E_ENABLED = import.meta.env.VITE_E2E === '1'` — a build-time
  flag. `e2e:server` builds with `VITE_E2E=1`; real Cloudflare builds do not, so
  Vite **tree-shakes the entire oracle out of production**. Children cannot
  inspect answers in the shipped app.
- `export function E2EOracle(props: { data: OracleData }): JSX.Element | null`
  returns `null` unless `E2E_ENABLED`, otherwise a single hidden node:
  `<div data-testid="e2e-oracle" data-oracle={JSON.stringify(props.data)} hidden />`.

**Oracle payload (uniform across modules):**

```ts
interface OracleData {
  expected: string;            // canonical answer a knowing user would give:
                               // "56", "5/8", "07:45", "Yes", "A"
  inputMode: 'choices' | 'typed';
  difficulty?: 'easy' | 'medium' | 'hard';
  choices?: string[];          // on-screen button labels when inputMode==='choices'
  correctChoice?: string;      // which label is correct (may be "None of these")
  highlightCount?: number;     // # of highlighted chart elements (clue detector)
}
```

**Per-module wiring:** each of the 15 `*Play.tsx` components mounts
`<E2EOracle data={...} />` computed from its *current* question. Because the node
re-renders per question, Playwright locators auto-wait on its `data-oracle`
attribute changing between questions.

**Delay collapse:** under `E2E_ENABLED`, the feedback→next-question delays (e.g.
800/2600 ms) collapse to ~50 ms so the suite runs fast and without brittle
waits. Implemented via a shared `feedbackDelay(ms)` helper that returns a small
constant when the flag is set.

## Component 2 — Per-module test manifest

**File:** `e2e/support/manifests.ts`

Each module contributes a manifest whose option lists are **imported from the
app's own exports** (e.g. `ALL_SKILLS`, difficulty unions) so the tests cannot
drift from the real options:

```ts
interface ModuleManifest {
  slug: string;                        // route segment, e.g. 'fractions'
  title: string;                       // heading text for setup screen
  start(page: Page, opts: StartOpts): Promise<void>; // setup adapter
  skills?: readonly string[];          // from the module's ALL_SKILLS
  difficulties?: readonly Difficulty[];
  subOptions?: Record<string, readonly unknown[]>; // denominators, digits, mode…
  supportsTypedHard?: boolean;         // whether 'hard' switches to typed input
  hasDifficulty?: boolean;             // charts has none
}
```

The module registry (single source of the 15 modules) is the `MODULES` array in
`src/pages/Hub.tsx` (`slug` + `title` per module). Per-module skill/option lists
are imported from each module's own exports (`ALL_SKILLS`,
`*_SKILL_OPTIONS`, difficulty unions) — the existing
`src/__tests__/play-skill-coverage.test.tsx` already imports every module's Play
component and skill list this way and is the reference pattern for the manifests.

## Component 3 — Reusable harness

**Files:** `e2e/support/play.ts`, `e2e/support/oracle.ts`, `e2e/support/a11y.ts`

- `oracle(page): Promise<OracleData>` — reads and parses the `e2e-oracle` node,
  auto-waiting via the locator.
- `startGame(page, manifest, opts)` — navigate to the module and run its setup
  adapter (pick skill/difficulty/sub-option, click Start).
- `answerCorrectly(page)` — reads the oracle; clicks `correctChoice` or types
  `expected` and submits.
- `answerWrong(page)` — deliberately picks a wrong choice / types a wrong value.
- `questionSignature(page)` — `prompt + expected`, used to measure variety.
- `expectNoClues(page)` — asserts `highlightCount ?? 0 === 0` and the `expected`
  string is not present in the visible (non-hidden) DOM.
- `checkA11y(page)` — runs `@axe-core/playwright`, fails on serious/critical.

## Component 4 — Specs

### 4a. Bug-regression specs (first-class, highest priority)

1. `e2e/bugs/fractions-variety.spec.ts` (#7/#8) — start a low-variety config,
   answer 12 questions, assert no consecutive-identical signatures and a minimum
   distinct count.
2. `e2e/bugs/fractions-equivalent.spec.ts` (#9) — read `expected` (e.g. `5/8`),
   type an equivalent unsimplified form (`10/16`), assert **Correct!** plus the
   simplest-form nudge, not an "incorrect" state; also assert a wrong answer
   remains visible for the longer duration.
3. `e2e/bugs/charts-no-clue.spec.ts` (#10) — across several bar/line reads assert
   `highlightCount === 0`; for `pie-fraction` assert the slice *is* highlighted.
4. `e2e/bugs/rewards-save-feedback.spec.ts` (#5) — switch reward type to balance,
   clear the unit label, Save → assert the specific unit-label message; fill it →
   **Saved.**

### 4b. Generated per-module / per-option matrix

`e2e/gameplay.spec.ts` iterates manifests and, for each option value in
isolation, runs the functionality assertions from the Principles/Functionality
list: start → answer-correct scores → answer-wrong is wrong → difficulty→input
mapping → no-clues → variety → completion.

### 4c. Cross-cutting quality specs

- `e2e/quality/a11y.spec.ts` — `checkA11y` on each module's setup, play, and
  results screens.
- `e2e/quality/responsive.spec.ts` — the core play flow of each module at
  375 / 768 / 1280 px; assert no horizontal body overflow and controls reachable.
- `e2e/quality/i18n.spec.ts` — for `en-GB, cy, es, fr`: switch locale, assert no
  raw translation-key markers on core screens and that they render. Stub locales
  are asserted to fall back cleanly to `en-GB`.

## Component 5 — Performance & CI

- **Parallelism:** gameplay/a11y/responsive/i18n specs are client-side
  (localStorage; no auth/D1) and run **parallel** in a dedicated Playwright
  project. Parent/reward/D1 specs remain **serial** in a second project. Config
  is updated to define both projects against the same `webServer`.
- **CI:** `.github/workflows/ci.yml` on push + pull_request:
  1. `npm ci`
  2. `npm test` (vitest)
  3. `npx playwright install --with-deps chromium` (cached)
  4. `npm run test:e2e`
  A regression now fails the build before it can deploy.

## Component 6 — Documentation

`e2e/README.md`: what the oracle is and why it is safe (build-flag gated,
tree-shaken from prod), the manifest format, the harness API, and a step-by-step
"cover a new module" recipe.

## Out of scope (explicitly)

- Visual screenshot/pixel regression.
- Load/performance testing.
- The reward-settings UX redesign (bug #6 — logged separately).
- Backend/Functions unit coverage beyond what already exists.

## Phasing (each phase lands independently)

1. **Oracle + harness + 4 bug specs** — immediate regression value.
2. **Per-module correctness matrix** — the exhaustive per-option gameplay tests.
3. **Quality layers** — a11y, responsive, i18n.
4. **CI workflow** — wire it all to run on push/PR.

## Risks & mitigations

- *Oracle leaks to production* → gated by `VITE_E2E`, verified by a build check
  that the string `e2e-oracle` is absent from a normal `npm run build` bundle.
- *Flaky timing* → oracle node re-render as the wait signal; collapsed delays;
  no fixed `waitForTimeout`.
- *Per-module setup drift* → manifests import the app's own option lists; a
  smoke assertion fails loudly if a module's setup adapter can't reach a game.
- *Runtime blow-up* → isolated (not cartesian) coverage; parallel gameplay
  project; CI sharding if needed.
