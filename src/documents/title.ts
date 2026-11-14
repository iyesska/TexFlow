/**
 * A document's title, read from its text. Shared by the browser, which shows it as the
 * writer types, and the server, which stores it with the document.
 */

export const UNTITLED_DOCUMENT = "Documento sin título";

const FENCE = /^\s{0,3}(```|~~~)/;
const ATX_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

const FRONT_MATTER = /^---\n([\s\S]*?)\n(?:---|\.\.\.)(?:\n|$)/;
const YAML_TITLE = /^title:\s*(.+?)\s*$/m;

/** The `title` of a leading YAML metadata block, and the Markdown that follows it. */
function splitFrontMatter(markdown: string): { title: string | undefined; body: string } {
  const block = FRONT_MATTER.exec(markdown);
  if (!block) return { title: undefined, body: markdown };
  const title = YAML_TITLE.exec(block[1] ?? "")?.[1]?.replace(/^(["'])(.*)\1$/, "$2");
  return { title, body: markdown.slice(block[0].length) };
}

/**
 * The document's title: the `title` of its YAML metadata if it has one, otherwise its
 * first heading, ignoring anything inside code fences.
 */
export function deriveTitle(markdown: string): string {
  const { title, body } = splitFrontMatter(markdown);
  if (title) return title;

  let insideFence = false;
  for (const line of body.split("\n")) {
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
