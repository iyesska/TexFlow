import "server-only";

import { welcomeDocument } from "@/documents/sample-document";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { createDocument } from "./documents";

/** Gives a new account its first document: a tour of what TexFlow understands. */
export async function createWelcomeDocument(
  userId: string,
  name: string | null,
): Promise<void> {
  await createDocument(userId, {
    markdown: welcomeDocument(name),
    settings: DEFAULT_SETTINGS,
  });
}
