// e2e/fixtures.ts
//
// A drop-in replacement for `@playwright/test`'s `test` that, when COVERAGE=1,
// harvests the instrumented app's per-file coverage (window.__coverage__,
// injected by vite-plugin-istanbul) after each test and writes it to
// .nyc_output/. `npm run coverage:all` then merges these with the unit
// coverage via nyc into a single report.
import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const COVERAGE = process.env.COVERAGE === '1';
const NYC_DIR = path.resolve(process.cwd(), '.nyc_output');

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
    if (!COVERAGE) return;
    try {
      const coverage = await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => (window as any).__coverage__,
      );
      if (coverage) {
        fs.mkdirSync(NYC_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(NYC_DIR, `e2e-${crypto.randomUUID()}.json`),
          JSON.stringify(coverage),
        );
      }
    } catch {
      // Page may already be closing / navigated away — skip this sample.
    }
  },
});

export { expect };
