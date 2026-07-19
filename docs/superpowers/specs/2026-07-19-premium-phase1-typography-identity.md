# Premium Phase 1 — Typography + Module Identity

**Date:** 2026-07-19 · **Status:** approved direction (premium pack roadmap + Nunito confirmed by user)

## Goals
1. **Nunito everywhere, self-hosted.** Replace the Google-Fonts-CDN Comfortaa import with the already-installed `@fontsource/nunito` (weights 400/600/700/800). Kills the external font dependency (offline/PWA-correct, no third-party request, faster first paint) and lands the confirmed kid-friendly face.
2. **Tabular numerals globally.** `font-variant-numeric: tabular-nums` on `body` — a maths app's digits must never jiggle (scores, timers, questions).
3. **Module identity colors.** Each of the 15 modules gets a signature hue in a shared map (`src/lib/moduleAccent.ts`). Phase 1 applies it to the Hub tiles (icon/glyph color + soft tinted icon background), making the hub read as a colorful curriculum map instead of a monochrome grid. The exported map is the single source later phases (setup headers, progress bars, celebrations) draw from.
4. **Loading polish.** Module `Loading...` fallback gets a gentle pulse (`animate-pulse`) — no copy change (tests assert the text).

## Non-goals (later phases)
Motion/sound, celebrations, onboarding, PWA install flow, mascot, per-module accent inside module screens.

## Design decisions
- Body/base: Nunito 400/600; bold UI: 700/800. `font-sans` stack: `'Nunito', ui-rounded, system-ui, sans-serif`. `font-comfortaa` Tailwind alias re-pointed to the same stack so no component edits are needed; the CDN `@import` is deleted.
- Accents are theme-safe mid-saturation HSL values readable on light and dark grounds; icon tint uses the accent at low alpha.
- Dark-mode: accents used for icon/glyph only (never body text), so contrast stays governed by the existing theme tokens.

## Plan (inline, small)
1. Fonts: import @fontsource/nunito weights in `src/main.tsx`; delete CDN import; update `tailwind.config.ts` (`fontFamily.sans` + re-point `comfortaa`); add `font-variant-numeric: tabular-nums` to `body` in `index.css`.
2. `src/lib/moduleAccent.ts`: `MODULE_ACCENT: Record<slug, { hue: string; soft: string }>` for all 15 slugs + `moduleAccent(slug)` helper; unit test asserts every Hub slug has an entry.
3. Hub tiles consume the map (icon color + tinted icon chip). Visual check via build; suites + tsc green.
