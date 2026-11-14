import { test as base, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { SAMPLE_DOCUMENT } from "../../src/documents/sample-document";
import type { DocumentSettings } from "../../src/templates/settings";

import { createAccount, createDocument, type TestAccount } from "./database";
import { E2E_AUTH_SECRET, E2E_BASE_URL } from "./env";

/** The cookie Auth.js keeps the session in, over plain HTTP. */
const SESSION_COOKIE = "authjs.session-token";

/** A session token like the one signing in issues, signed with the server's secret. */
export function sessionToken(account: TestAccount): Promise<string> {
  return encode({
    token: { sub: account.id, name: account.name, email: account.email },
    secret: E2E_AUTH_SECRET,
    salt: SESSION_COOKIE,
    maxAge: 60 * 60,
  });
}

/** Signs `page`'s browser context in as `account`. */
export async function signIn(page: Page, account: TestAccount): Promise<void> {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: await sessionToken(account),
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export interface OpenDocumentOptions {
  readonly markdown?: string;
  readonly settings?: DocumentSettings;
}

interface Fixtures {
  /** A user of the test's own, signed in in the page's browser. */
  account: TestAccount;
  /**
   * Creates a document for the account, the sample by default, and opens it in the
   * editor. Resolves to its id.
   */
  openDocument: (options?: OpenDocumentOptions) => Promise<string>;
}

export const test = base.extend<Fixtures>({
  // The second argument is Playwright's `use`, renamed so it is not taken for a hook.
  account: async ({ page }, provide) => {
    const account = await createAccount();
    await signIn(page, account);
    await provide(account);
  },
  openDocument: async ({ page, account }, provide) => {
    await provide(async (options = {}) => {
      const id = await createDocument(account.id, {
        markdown: options.markdown ?? SAMPLE_DOCUMENT,
        ...(options.settings ? { settings: options.settings } : {}),
      });
      await page.goto(`/documents/${id}`);
      return id;
    });
  },
});

export { expect, type Page } from "@playwright/test";
