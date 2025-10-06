import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/server/__tests__/**/*.test.{ts,tsx}",
      "src/server/__tests__/**/*.test.ts",
      "src/features/charter-onboarding/__tests__/**/*.test.{ts,tsx}",
      "src/lib/**/__tests__/**/*.test.{ts,tsx}",
      "src/hooks/**/__tests__/**/*.test.{ts,tsx}",
    ],
    environment: "jsdom", // Default to jsdom for most tests
    setupFiles: ["vitest.setup.ts"],
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
