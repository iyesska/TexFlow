import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** A database of its own: tests create and remove users freely. */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://texflow:texflow@127.0.0.1:5432/texflow_test";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside a React server bundle; tests import server code directly.
      "server-only": fileURLToPath(new URL("./vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globalSetup: ["./vitest.global-setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "test-secret-for-vitest-only-0123456789abcdef",
    },
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
