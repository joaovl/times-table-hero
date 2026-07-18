# i18n Foundation — Design Spec

**Date:** 2026-07-18
**Status:** Approved (user, 2026-07-18)
**Goal:** Every user-facing string lives in per-language JSON files; the app detects the device language (web / Android / iOS all via `navigator.language`), a parent can override it, and switching is instant. Locale-aware maths: number formats, currency, and unit gating — not just translated labels.

## Locked decisions

| Decision | Choice |
|---|---|
| Launch languages | `en` (source of truth), `pt`, `es`, `fr` |
| Who controls language | Device-wide; auto-detect on first run; parent-area selector overrides |
| Depth | Full: UI strings + locale number input/display + currency swap + imperial gating |
| Library | Hand-rolled `t()` (~60 lines), no i18next dependency |

## 1. Core — `src/lib/i18n/`

- `locales/en.json`, `locales/pt.json`, `locales/es.json`, `locales/fr.json`.
  - Flat, module-namespaced dot keys: `"fractions.setup.skills"`, `"parent.kids.addKid"`, `"play.feedback.brilliant"`.
  - `en.json` is the source of truth. Other files carry the same keys; **any missing key falls back to the English string at runtime** (a half-translated language never renders a blank).
  - Non-`en` files may carry `"_meta": { "status": "draft" | "verified" }` for the community-contribution story. `_meta` is ignored by the runtime.
- `i18n.ts`:
  - `t(key, params?)` — `{name}`-style interpolation.
  - Plurals via key suffixes `key.one` / `key.other` (sufficient for en/pt/es/fr). `t()` picks the suffix when `params.count` is a number.
  - **Compile-time key safety:** `type MessageKey = keyof typeof en` derived from the JSON import (`resolveJsonModule`). A typo in a key is a `tsc` error.
- `LocaleProvider` (React context) + `useT()` hook. Language change flips context state → instant re-render, no reload.
- Detection order: `localStorage['tth_lang']` → `navigator.language` prefix match (`pt-BR` → `pt`) → `en`.
- Parent area: a "Language" card with a selector; writes `tth_lang` and applies immediately device-wide. Also shown labeled in each language's own name ("Português", "Español", "Français") so a mis-set device is recoverable.

## 2. Locale numbers — `src/lib/i18n/number.ts`

- `formatNumber(n)` via `Intl.NumberFormat(locale)` for everything displayed: question text, choice buttons, scores, dashboards.
- `parseAnswer(s)` for typed inputs: accepts **both** `.` and the locale decimal separator (`3.5` and `3,5` both parse in comma locales); strips grouping separators.
- Graders keep operating on plain `number`s. Only the display/parse boundary changes — the existing logic test suite remains valid unchanged.
- Multiple-choice distractor formatting flows through `formatNumber` (choices must match the display convention or `isWrong` string comparison breaks — the choice pipeline formats numbers exactly once, at display).

## 3. Currency — money module

- `CurrencyConfig`: `{ code, symbol, symbolPosition, denominations: number[] }` (coins + notes in minor units).
- Locale→currency map: `en-GB`→GBP £, `en-US`→USD $, `pt-PT`/`es`/`fr`→EUR €, `pt-BR`→BRL R$.
- The money question generator takes a `CurrencyConfig`; amounts, coin-selection questions and answers render in the kid's currency. Grading is numeric (minor units) — unchanged.

## 4. Unit gating — conversions module

- Imperial skills (miles, pounds, pints, …) are offered only under `en` locales; metric-only elsewhere. UK keeps miles↔km (national curriculum requirement).
- Gating is a filter on the skill list at setup time; no generator changes.

## 5. Extraction

- Mechanical, module-by-module: 15 modules + parent area + shared components + feedback/celebration copy (~400–600 strings).
- Zero logic changes; every extraction batch keeps `tsc` + unit tests green.
- **E2e alignment:** `e2e/support` helpers import human labels **from `en.json`** instead of hardcoding them — eliminates the label-drift test breakage class permanently. The e2e suite runs in `en`.

## 6. Translations

- `en`: hand-written now (extraction is copy-move).
- `pt`: drafted by the assistant, verified by the user.
- `es`, `fr`: drafted, marked `"_meta": {"status": "draft"}`, inviting community PRs.

## 7. Testing

- Unit: `t()` fallback/plural/interpolation; `parseAnswer` per locale (dot, comma, grouping); currency configs (symbol, denominations); locale detection order.
- Key-parity test: every key in `en.json` exists (or intentionally falls back) — a script test that diffs key sets so a new string can't silently ship untranslated without at least being flagged.
- E2e (real stack): one new spec — parent switches language in the parent area → visible UI flips instantly (assert a known label in the target language) → persists across reload. Suite otherwise unchanged, in English.

## 8. Execution phases

1. Core `i18n.ts` + `LocaleProvider` + detection + number/currency infra (all unit-tested).
2. Parent area + shared UI extraction, language selector card.
3. Module extraction, batched (roughly 3–4 modules per task).
4. Money currency behavior + conversions gating.
5. `pt`/`es`/`fr` translation files + language-switch e2e spec.

## Out of scope (explicitly)

- RTL layouts (Arabic/Hebrew) — layouts stay flex-based so this is a later `dir="rtl"` pass.
- Per-kid language (device-wide only, per locked decision).
- Translating user-entered content (kid names, reward labels — parents write those in their own language already).
