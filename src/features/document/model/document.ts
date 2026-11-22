import type { DocumentSettings } from "@/templates/settings";

/** A document as it is persisted: its text and how it is laid out. */
export interface StoredDocument {
  readonly id: string;
  readonly markdown: string;
  readonly settings: DocumentSettings;
  /** ISO 8601 timestamp of the last save. */
  readonly updatedAt: string;
}

/** The document a browser kept before accounts existed; imported once on sign-in. */
export const LOCAL_DOCUMENT_ID = "local";

/** Counts words, where a word is any run of characters containing a letter or digit. */
export function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}
