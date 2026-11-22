import "server-only";

import { randomUUID } from "node:crypto";

import { inject } from "vitest";

import { db } from "@/server/db/client";

/** Whether the test database is up; use with describe.skipIf. */
export const databaseAvailable = inject("databaseAvailable");

/**
 * A user of their own for one test. Tests never share users, so they can run in
 * parallel against the same database without seeing each other's rows.
 */
export async function createTestUser(name = "Persona de prueba") {
  return db().user.create({
    data: { name, email: `test-${randomUUID()}@texflow.test` },
    select: { id: true, name: true, email: true },
  });
}
