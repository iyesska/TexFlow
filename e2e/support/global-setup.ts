import { execFileSync } from "node:child_process";

import { closeDatabase, deleteAllAccounts } from "./database";
import { E2E_DATABASE_URL } from "./env";

/** Brings the test database to the latest migration and empties it. */
export default async function globalSetup() {
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "pipe",
    timeout: 60_000,
  });
  await deleteAllAccounts();
  await closeDatabase();
}
