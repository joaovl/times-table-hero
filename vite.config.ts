/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { execSync } from "child_process";

// Get git commit hash for build versioning
const getGitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Times Table Hero",
        short_name: "Maths Hero",
        description:
          "Free maths practice for kids — Y3-Y5 UK curriculum. Practice online or print worksheets.",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["education", "kids"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2,json,ico}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __GIT_HASH__: JSON.stringify(getGitHash()),
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy dependencies into their own chunks so the main app
        // bundle stays under Vite's 500 kB warning threshold. jspdf only
        // loads when a user actually generates a worksheet, and react /
        // router are shared across every page.
        manualChunks: {
          jspdf: ["jspdf"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    // Vitest owns unit/component tests under src/ and functions/. The e2e/
    // directory holds Playwright specs (`*.spec.ts` using @playwright/test) and
    // must be excluded here or Vitest tries to run them and fails to collect.
    include: ["src/**/*.{test,spec}.{ts,tsx}", "functions/**/*.{test,spec}.ts"],
    // Tests that render React components need a DOM. We use jsdom on a
    // per-file basis (via `@vitest-environment jsdom` pragma) so the bulk
    // of the logic / pdf suite still runs in node for speed; only the
    // *.a11y.test.tsx files opt into jsdom.
    environment: "node",
    // The exhaustive end-to-end arithmetic PDF test sweeps every modal
    // combination and can take several seconds on slower machines. Use a
    // generous default so it doesn't trip the watchdog under CI load.
    testTimeout: 30000,
  },
});
