import { execFileSync } from "node:child_process";

import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    /** Whether the test database is reachable and migrated; database tests skip if not. */
    databaseAvailable: boolean;
  }
}

/** Brings the test database up to the latest migration before any test runs. */
export default function setup(project: TestProject) {
  try {
    execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      // The URL the config gives the tests (vitest.config.mts).
      env: { ...process.env, DATABASE_URL: project.config.env.DATABASE_URL },
      stdio: "pipe",
      timeout: 60_000,
    });
    project.provide("databaseAvailable", true);
  } catch (error) {
    const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn(`[tests] No test database (${detail}); database tests are skipped.`);
    project.provide("databaseAvailable", false);
  }
}
