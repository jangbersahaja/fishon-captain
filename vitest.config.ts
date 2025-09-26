import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/server/__tests__/**/*.test.{ts,tsx}",
      "src/server/__tests__/**/*.test.ts",
      "src/features/charter-onboarding/__tests__/**/*.test.{ts,tsx}",
    ],
    // Use node for server tests, jsdom for client feature tests
    environmentMatchGlobs: [
      ["src/server/__tests__/**", "node"],
      ["src/features/charter-onboarding/__tests__/**", "jsdom"],
    ],
    setupFiles: [],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Feature alias used throughout refactored charter form module
      "@features": path.resolve(__dirname, "./src/features"),
    },
  },
});
