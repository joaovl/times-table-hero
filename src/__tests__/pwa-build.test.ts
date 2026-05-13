import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Smoke tests for the PWA build configuration.
 *
 * The first test always runs: it parses vite.config.ts as text and confirms
 * the manifest entries we rely on (name, theme_color, icons of the right
 * sizes) are present in the source. This catches a regression where someone
 * accidentally drops an icon entry without rebuilding.
 *
 * The remaining tests only run when a `dist/` build is present. They confirm
 * vite-plugin-pwa emitted `sw.js`, `manifest.webmanifest`, and at least one
 * icon file. CI can set `SKIP_BUILD_TESTS=1` to opt out entirely.
 */

const root = resolve(__dirname, '..', '..');
const dist = join(root, 'dist');
const skipAll = process.env.SKIP_BUILD_TESTS === '1';
const distExists = existsSync(dist);

describe('PWA build configuration', () => {
  test.skipIf(skipAll)('vite.config.ts declares the expected PWA manifest', () => {
    const cfg = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    expect(cfg).toContain('VitePWA');
    expect(cfg).toContain('Times Table Hero');
    expect(cfg).toContain('"#7c3aed"');
    // The manifest must list 192x192 and 512x512 icons (one of each at a
    // minimum). The maskable variant is optional but expected.
    expect(cfg).toMatch(/sizes:\s*"192x192"/);
    expect(cfg).toMatch(/sizes:\s*"512x512"/);
    expect(cfg).toMatch(/purpose:\s*"maskable"/);
  });
});

describe('PWA build artifacts', () => {
  test.skipIf(skipAll || !distExists)('emits a service worker', () => {
    expect(existsSync(join(dist, 'sw.js'))).toBe(true);
  });

  test.skipIf(skipAll || !distExists)('emits a web app manifest', () => {
    const manifestPath = join(dist, 'manifest.webmanifest');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test.skipIf(skipAll || !distExists)('ships at least one icon asset', () => {
    const files = readdirSync(dist);
    const hasIcon = files.some((f) => /\.(png|svg|ico)$/i.test(f));
    expect(hasIcon).toBe(true);
  });
});
