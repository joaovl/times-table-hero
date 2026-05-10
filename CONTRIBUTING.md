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

## Pull requests

- Keep PRs focused. One module or one bug fix per PR is ideal.
- Describe the change and link the issue it closes.
- Include a screenshot or short clip for any UI change.
- Don't bump the version number; that happens at release time.
