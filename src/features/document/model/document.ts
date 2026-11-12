/** A document as it is persisted. */
export interface StoredDocument {
  readonly id: string;
  readonly markdown: string;
  /** ISO 8601 timestamp of the last save. */
  readonly updatedAt: string;
}

/** Until documents can be created and named (phase 7) there is a single local one. */
export const LOCAL_DOCUMENT_ID = "local";

export const UNTITLED_DOCUMENT = "Documento sin título";

const FENCE = /^\s{0,3}(```|~~~)/;
const ATX_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

/** The document's title: its first heading, ignoring anything inside code fences. */
export function deriveTitle(markdown: string): string {
  let insideFence = false;
  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;
    const heading = ATX_HEADING.exec(line)?.[1];
    if (heading) return heading.replace(/[*_`]/g, "").trim() || UNTITLED_DOCUMENT;
  }
  return UNTITLED_DOCUMENT;
}

/** Counts words, where a word is any run of characters containing a letter or digit. */
export function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}
