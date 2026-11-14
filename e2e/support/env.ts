/**
 * The end-to-end tests run against a server of their own, with a database of their
 * own: they create and delete accounts freely. Override with E2E_DATABASE_URL.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://texflow:texflow@127.0.0.1:5432/texflow_e2e";

/** Signs the test server's sessions; the fixtures sign theirs with it too. */
export const E2E_AUTH_SECRET = "e2e-secret-for-playwright-only-0123456789abcdef";

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3200);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
