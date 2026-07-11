import { defineConfig, devices } from '@playwright/test';

// Real end-to-end tests: a headless Chromium drives the built app served by
// `wrangler pages dev`, which runs the actual Pages Functions against a local
// D1 database. Unlike the unit/component tests (which mock the API), these
// exercise the whole stack: browser -> fetch -> Functions -> D1 and back.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8788',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run e2e:server',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
