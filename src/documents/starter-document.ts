import { UNTITLED_DOCUMENT } from "./title";

/**
 * The text a new document starts with: the metadata block the templates read the
 * title and author from, ready to be filled in.
 */
export function starterDocument(authorName: string | null): string {
  const author = authorName?.replace(/[\r\n"\\]/g, " ").trim();
  return [
    "---",
    `title: ${UNTITLED_DOCUMENT}`,
    ...(author ? [`author: "${author}"`] : []),
    "---",
    "",
    "",
  ].join("\n");
}
