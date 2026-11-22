import { defineConfig, devices } from "@playwright/test";

import {
  E2E_AUTH_SECRET,
  E2E_BASE_URL,
  E2E_DATABASE_URL,
  E2E_PORT,
} from "./e2e/support/env";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/support/global-setup.ts",
  use: { baseURL: E2E_BASE_URL, trace: "off" },
  projects: [
    {
      name: "desktop",
      testMatch: /\.desktop\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      testMatch: /\.mobile\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/login`,
    // A server already on the port is reused only outside CI, and only one started
    // for these tests: it must use the test database and secret below.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: E2E_AUTH_SECRET,
      AUTH_TRUST_HOST: "true",
      NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
    },
  },
});
