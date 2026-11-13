import "server-only";

const MIN_SHARED_WORDS = 2;
const MIN_SHARED_RATIO = 0.6;

/** The words of a line, without markup: what Markdown and LaTeX have in common. */
function words(line: string): string[] {
  return line
    .replace(/\\[a-zA-Z@]+\*?/g, " ")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3);
}

/**
 * Finds the Markdown line a LaTeX problem came from. 1-based, or undefined when there
 * is no confident answer: a wrong line is worse than none.
 *
 * @param token Text that must appear on the line, such as the offending command.
 * @param latexLine The LaTeX source line the engine reported.
 */
export function locateInMarkdown(
  markdown: string,
  token: string | undefined,
  latexLine: string | undefined,
): number | undefined {
  const lines = markdown.split("\n");
  const candidates = token
    ? lines.flatMap((line, index) => (line.includes(token) ? [index] : []))
    : lines.map((_line, index) => index);
  if (token && candidates.length === 1) return (candidates[0] ?? 0) + 1;
  if (candidates.length === 0 || !latexLine) return undefined;

  // Several candidates: take the one that shares the most words with the LaTeX line.
  const wanted = new Set(words(latexLine));
  if (wanted.size < MIN_SHARED_WORDS) return undefined;
  let best: { index: number; shared: number } | undefined;
  let tied = false;
  for (const index of candidates) {
    const shared = new Set(words(lines[index] ?? "").filter((word) => wanted.has(word)))
      .size;
    if (best === undefined || shared > best.shared) {
      best = { index, shared };
      tied = false;
    } else if (shared === best.shared) {
      tied = true;
    }
  }
  if (!best || tied) return undefined;
  const confident =
    best.shared >= MIN_SHARED_WORDS && best.shared / wanted.size >= MIN_SHARED_RATIO;
  return confident ? best.index + 1 : undefined;
}
