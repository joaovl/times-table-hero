# End-to-end tests

Real Chromium drives the built app served by `wrangler pages dev` against a
local D1 database — browser → fetch → Pages Functions → D1. Nothing is mocked.

## Run

```bash
npm run test:e2e            # headless
npm run test:e2e:headed     # watch it
PWSLOW=350 npm run test:e2e:headed  # slow motion
```

## The answer oracle

Gameplay questions are random, so tests read the correct move from a hidden,
test-only node exposed by the app: `data-testid="e2e-oracle"` carrying a JSON
`OracleData` payload (`expected`, `inputMode`, `choices`, `correctChoice`,
`highlightCount`, `questionId`).

It is gated by `import.meta.env.VITE_E2E === '1'`, set only by `.env.e2e` when
the e2e server builds with `vite build --mode e2e`. A normal `npm run build`
leaves it out entirely, so the oracle never ships to real users. Tests still
click and type through the real UI — the oracle only tells them what a knowing
user would do.

## Covering a new module

1. Add `<moduleName>/oracle.ts` with a pure `…Oracle(question)` returning
   `OracleData`, with a Vitest test.
2. Mount it guarded so it tree-shakes from production:
   `{E2E_ENABLED && <E2EOracle data={…} />}` in the module's `*Play.tsx`
   (import `E2E_ENABLED` from `@/lib/e2e/env`), and wrap feedback delays in
   `feedbackDelay(...)`. The guard is what keeps `e2e-oracle` out of the
   production bundle — verify with `npm run build && grep -rl e2e-oracle dist`
   (expect no match).
3. Add a setup adapter in `e2e/support/play.ts`.
