import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
  plugins: [react()],
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
});
