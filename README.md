# Times Table Hero

Free maths practice for kids — practice online or print worksheets.

Live site: https://times-table-hero.pages.dev/

![Times Table Hero screenshot](public/screenshot.png)

## What it does

Times Table Hero is a kid-friendly maths practice app with six learning modules. Each module supports two ways to practice:

- **Online play** — pick a skill, difficulty, and game mode, then answer questions in the browser. Results are tracked per local user profile.
- **Printable worksheets** — generate an A4-ready PDF (with optional answer key) for offline practice.

There are no accounts, no tracking, no ads. Profiles are simple kid-friendly avatars stored in the browser.

## Modules

The Hub offers six modules, each fully self-contained:

- **Times Tables** — multiplication and division facts from 0 to 12.
- **Arithmetic** — addition, subtraction, multiplication, and division with configurable digit counts.
- **Time** — read analog clocks at varying precision and convert between 12-hour and 24-hour formats.
- **Fractions** — recognise, simplify, compare, add, and subtract fractions.
- **Shapes** — identify 2D and 3D shapes and count faces, edges, and vertices.
- **Charts** — read and interpret bar, line, and pie charts.

## Quickstart

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:8080.

To build the production bundle:

```bash
npm run build
```

Output lands in `dist/` as static files (HTML, CSS, JS, assets).

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on port 8080 |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run lint` | Run ESLint over the project |
| `npm run typecheck` | Run the TypeScript project references with `tsc -b --noEmit` |
| `npm test` | Run the Vitest test suite |
| `npm run test:ui` | Run Vitest with the interactive UI |

## Deploy

The project produces a plain static `dist/` directory, so any static host works.

### Cloudflare Pages (current host)

The live site at `times-table-hero.pages.dev` is deployed via Cloudflare Pages connected directly to the GitHub repository. There is no `wrangler.toml` — Pages handles the build itself.

To set up your own deployment:

1. Push the repo to GitHub.
2. In the Cloudflare dashboard, create a new Pages project and connect the repo.
3. Set the build configuration:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 18 or higher (set via the `NODE_VERSION` environment variable if needed).
4. Deploy.

### Other static hosts

The same `dist/` output deploys cleanly to Vercel, Netlify, GitHub Pages, or any static file server.

## Add a new module

Each module under `src/modules/<name>/` follows the same shape: `<Name>Index.tsx`, `<Name>Setup.tsx`, `<Name>Play.tsx`, `<Name>Results.tsx`, plus `logic.ts`, `pdf.ts`, `printConfig.ts`, `storage.ts`, and tests.

The roadmap document at [`docs/superpowers/specs/2026-05-10-future-modules-roadmap.md`](docs/superpowers/specs/2026-05-10-future-modules-roadmap.md) describes the shared module pattern and the planned modules in detail. Read that first, then mirror the folder shape of an existing module (`src/modules/arithmetic/` is a good reference).

## Tech stack

- [React 18](https://react.dev/) with TypeScript
- [Vite 5](https://vitejs.dev/) build tooling
- [Vitest](https://vitest.dev/) for unit and integration tests
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Router](https://reactrouter.com/) for navigation
- [jsPDF](https://github.com/parallax/jsPDF) for worksheet generation
- [Lucide React](https://lucide.dev/) for icons

## License

MIT — see [LICENSE](LICENSE).
