import { randomBytes, randomUUID, scryptSync } from "node:crypto";

import pg from "pg";

import { deriveTitle } from "../../src/documents/title";
import { DEFAULT_SETTINGS } from "../../src/templates/catalog";
import type { DocumentSettings } from "../../src/templates/settings";

import { E2E_DATABASE_URL } from "./env";

/**
 * Plain SQL against the test database, to set up what a test starts from. The
 * application's own data layer is server-only; these few inserts need nothing else.
 */

let pool: pg.Pool | undefined;
const database = () =>
  (pool ??= new pg.Pool({ connectionString: E2E_DATABASE_URL, max: 4 }));

/** An id of the shape the server generates and the routes accept. */
const newId = () => randomUUID().replaceAll("-", "");

export interface TestAccount {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

/**
 * A password hash in the server's format (src/server/auth/password.ts), which states its
 * own cost. A low one: these accounts only live for one test run.
 */
function hashPassword(password: string): string {
  const cost = { N: 2 ** 12, r: 8, p: 1 };
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize("NFKC"), salt, 64, cost);
  return [
    "scrypt",
    cost.N,
    cost.r,
    cost.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function createAccount(
  options: { readonly name?: string; readonly password?: string } = {},
): Promise<TestAccount> {
  const account = {
    id: newId(),
    name: options.name ?? "Persona de prueba",
    email: `e2e-${newId()}@texflow.test`,
  };
  await database().query(
    `INSERT INTO users (id, name, email, password_hash, updated_at)
     VALUES ($1, $2, $3, $4, now())`,
    [
      account.id,
      account.name,
      account.email,
      options.password ? hashPassword(options.password) : null,
    ],
  );
  return account;
}

export async function createDocument(
  ownerId: string,
  options: {
    readonly markdown: string;
    readonly settings?: DocumentSettings;
    readonly bibliography?: string;
    readonly folderId?: string | null;
    /** When it last changed; now by default. */
    readonly updatedAt?: Date;
  },
): Promise<string> {
  const id = newId();
  await database().query(
    `INSERT INTO documents
       (id, owner_id, folder_id, title, markdown, settings, bibliography, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, coalesce($8, now()))`,
    [
      id,
      ownerId,
      options.folderId ?? null,
      deriveTitle(options.markdown),
      options.markdown,
      JSON.stringify(options.settings ?? DEFAULT_SETTINGS),
      options.bibliography ?? "",
      options.updatedAt ?? null,
    ],
  );
  return id;
}

export async function createFolder(ownerId: string, name: string): Promise<string> {
  const id = newId();
  await database().query(
    "INSERT INTO folders (id, owner_id, name, updated_at) VALUES ($1, $2, $3, now())",
    [id, ownerId, name],
  );
  return id;
}

/** Empties the test database, for a run that starts clean. */
export async function deleteAllAccounts(): Promise<void> {
  await database().query("DELETE FROM users");
}

export async function closeDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
