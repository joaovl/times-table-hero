# Times Table Hero

Free maths practice for kids — practice online or print worksheets.

Live site: https://times-table-hero.pages.dev/

![Times Table Hero screenshot](public/screenshot.png)

## What it does

Times Table Hero is a kid-friendly maths practice app with six learning modules. Each module supports two ways to practice:

- **Online play** — pick a skill, difficulty, and game mode, then answer questions in the browser. Results are tracked per local user profile.
- **Printable worksheets** — generate an A4-ready PDF (with optional answer key) for offline practice.

There are no accounts, no tracking, no ads. Profiles are simple kid-friendly avatars stored in the browser. See [`PRIVACY.md`](PRIVACY.md) for the full privacy story.

## Modules

The Hub offers six modules, each fully self-contained:

- **Times Tables** — multiplication and division facts from 0 to 12.
- **Arithmetic** — addition, subtraction, multiplication, and division with configurable digit counts.
- **Time** — read analog clocks at varying precision and convert between 12-hour and 24-hour formats.
- **Fractions** — recognise, simplify, compare, add, and subtract fractions.
- **Shapes** — identify 2D and 3D shapes and count faces, edges, and vertices.
- **Charts** — read and interpret bar, line, and pie charts.

Six further modules cover Number Sense (place value, rounding, Roman numerals), Money, Decimals and percentages, Number Theory (factors, multiples, primes, squares, cubes), Measurement and Conversions, and Word Problems.

## Curriculum coverage

The app currently targets UK National Curriculum Key Stage 2, focusing on Years 3, 4, and 5. The table below summarises which strands each year practises across the twelve modules. The full objective-by-objective mapping is in [`docs/curriculum/uk-ks2.md`](docs/curriculum/uk-ks2.md).

| Year | Strands practised | Modules involved |
|---|---|---|
| Y3  | Number and place value, addition / subtraction, the 3 / 4 / 8 times tables, fractions of small denominators, money, telling time, simple measurement, bar charts | Times Tables, Arithmetic, Number Sense, Fractions, Money, Time, Word Problems, Conversions, Shapes, Charts |
| Y4  | Place value to 4 digits, rounding to 10 / 100 / 1,000, all times tables to 12, decimals to two places, factor pairs, area by counting squares, coordinates in the first quadrant, line and pie charts, time arithmetic | Number Sense, Arithmetic, Times Tables, Decimals, Number Theory, Shapes, Charts, Time, Money, Word Problems, Conversions |
| Y5  | Numbers to 1,000,000, percent and thousandths, primes / squares / cubes, mixed-number fractions, composite perimeter, area, volume of cubes / cuboids, 3-D shape properties, timetables, 12- and 24-hour time, multi-step problems | Number Sense, Decimals, Number Theory, Fractions, Conversions, Shapes, Charts, Time, Money, Word Problems |

Year 6 content is partially in scope (some Y6 skills appear in the Shapes module) but is not yet covered comprehensively. See the "Coverage gaps" section in [`docs/curriculum/uk-ks2.md`](docs/curriculum/uk-ks2.md) for the honest list.

## For teachers and parents

Times Table Hero is meant to be useful both in front of a screen and on paper. A few practical notes:

### Printing worksheets

Every module's setup screen has a **Print** button. It opens a small dialog where you can choose:

- How many pages to print (each page is A4-ready).
- How many questions per page.
- Which skills to include (the same chip multi-select used for online play).
- Whether to append an answer key at the end.

Click Download to save a PDF, then print it from any PDF viewer. The PDFs use a black-and-white layout suitable for school photocopiers.

### Sending a child straight to a module

Every module has a clean URL. You can bookmark it, paste it into a class messaging tool, or write it on a worksheet:

| Module | Online URL | Print dialog URL |
|---|---|---|
| Times Tables | `/times-tables` | `/times-tables/print` |
| Arithmetic | `/arithmetic` | `/arithmetic/print` |
| Time | `/time` | `/time/print` |
| Fractions | `/fractions` | `/fractions/print` |
| Shapes | `/shapes` | `/shapes/print` |
| Charts | `/charts` | `/charts/print` |

(Substitute `https://times-table-hero.pages.dev` for the live site, or your local dev server for `localhost:8080`.)

### Privacy and no sign-up

There is no sign-up, no email collection, no account, and no analytics. Everything a child does is stored only in their browser's local storage on the device they are using. Schools can use the app without consent forms because there is nothing to consent to — see [`PRIVACY.md`](PRIVACY.md) for the full version, including how to clear local data.

### What about progress tracking?

Progress is per-browser. Each child sees their own most-recent results on the Results screen of each module, and the module keeps a local rolling history of up to 50 sessions. There is no way to view a class-wide leaderboard, because no data leaves the device. For a classroom view, print a worksheet and mark it the old-fashioned way.

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

Start here:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the module shape, state flow, PDF encoding-safety rules, testing approach, and a diagram.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — code style, tests to run, PR conventions.
- [`docs/superpowers/specs/2026-05-10-future-modules-roadmap.md`](docs/superpowers/specs/2026-05-10-future-modules-roadmap.md) — the shared module spec and the planned modules in long-form.

Once you have read the architecture overview, mirror the folder shape of an existing module (`src/modules/arithmetic/` is a good reference).

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
