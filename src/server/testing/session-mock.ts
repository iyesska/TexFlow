import type { SessionUser } from "@/server/auth/session";

/**
 * Replaces the session module in route tests, which have no Auth.js request to read a
 * session from:
 *
 *   vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));
 *
 * then `signInAs(user)` or `signInAs(null)`.
 */

let current: SessionUser | null = null;

export function signInAs(user: SessionUser | null): void {
  current = user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return current;
}

export async function requireSessionUser(): Promise<SessionUser> {
  if (!current) throw new Error("NEXT_REDIRECT /login");
  return current;
}

/** A user for tests that do not touch the database. */
export const TEST_USER: SessionUser = {
  id: "testuser00000001",
  name: "Persona de prueba",
  email: "prueba@texflow.test",
};
