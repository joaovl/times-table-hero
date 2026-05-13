# Contributing

Thanks for your interest in Times Table Hero. This project welcomes bug reports, feature ideas, and pull requests.

## Filing issues

Open a GitHub issue with:

- A short title describing the problem or idea.
- Steps to reproduce (for bugs) or a clear description of the use case (for ideas).
- Browser and OS if the bug is rendering-related.
- A screenshot or short clip if the bug is visual.

## Proposing a new module

The Hub already lists six modules and a roadmap of more. Before starting work on a new module:

1. Read [`docs/superpowers/specs/2026-05-10-future-modules-roadmap.md`](docs/superpowers/specs/2026-05-10-future-modules-roadmap.md). It describes the shared shape every module follows and lists the planned modules in order.
2. Open an issue describing the module: the skills it covers, the setup options, and how the PDF will render.
3. Once aligned, mirror the folder shape of an existing module under `src/modules/<name>/`:
   - `<Name>Index.tsx`, `<Name>Setup.tsx`, `<Name>Play.tsx`, `<Name>Results.tsx`
   - `logic.ts`, `pdf.ts`, `printConfig.ts`, `storage.ts`
   - Co-located tests: `logic.test.ts`, `pdf.test.ts`, etc.

`src/modules/arithmetic/` is the cleanest reference.

## Code conventions

- **TypeScript strict mode.** New code should compile under the project's `tsc -b` configuration without `any` shortcuts where avoidable.
- **Tailwind utilities for styling.** Compose utility classes directly in JSX. Avoid adding custom CSS classes for things Tailwind can already express.
- **No emojis in source or PDF output.** This includes UI strings, console output, log messages, and worksheet text. Use plain words or Lucide icons.
- **Encoding-safe glyphs only in PDF output.** jsPDF renders Helvetica with WinAnsi encoding. Characters outside that range render as garbage. The minus sign is the classic trap: use ASCII hyphen-minus (`-`, U+002D), not the math minus (U+2212). See the comment block at the top of `src/modules/arithmetic/pdf.ts` for the full list of safe operator glyphs. When in doubt, test the PDF visually.
- **One module per folder.** Don't reach across modules at runtime. Shared logic belongs in `src/lib/`.
- **Tests next to the code they cover.** New logic files get a `.test.ts` sibling.

## Verifying changes

Before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
```

All three should pass. `npm run build` also catches issues that pure typechecking misses, like chunk-size regressions.

## Translating

The app ships with a small hand-rolled i18n scaffold (no `i18next`, no `react-intl`). en-GB is the source of truth.

- Dictionaries live in [`src/lib/locales/`](src/lib/locales/), one file per locale.
- `src/lib/locales/en-GB.ts` is the canonical key list. Other locales (`cy.ts`, `es.ts`, `fr.ts`) ship empty and fall back to en-GB automatically — so a partial translation is fine.
- Keys are namespaced by area, dot-separated: `hub.title`, `arithmetic.setup.title`, `common.cancel`, etc.
- Variables use `{name}` placeholders: `t('hub.greeting', { name: user.name })`.

### Adding a translation

1. Open the locale file you want to contribute to (e.g. `src/lib/locales/fr.ts`).
2. Add the same key that exists in `en-GB.ts`, with the translated string:
   ```ts
   const fr: Record<string, string> = {
     'hub.title': 'Défi Maths',
   };
   ```
3. Don't remove or rename keys in `en-GB.ts` without checking usage with `grep` — other locales fall through to it.

### Wiring strings to `t()`

Most UI strings are still plain inline JSX. When you touch a screen, feel free to migrate its strings to `t()` as you go — there's no need to migrate everything in one PR.

```tsx
import { t } from '@/lib/i18n';

<h1>{t('hub.title')}</h1>
```

A locale switcher isn't shipped yet; for now `useLocale()` and `setLocale()` exist as plumbing so forks can wire one up.

## Pull requests

- Keep PRs focused. One module or one bug fix per PR is ideal.
- Describe the change and link the issue it closes.
- Include a screenshot or short clip for any UI change.
- Don't bump the version number; that happens at release time.
