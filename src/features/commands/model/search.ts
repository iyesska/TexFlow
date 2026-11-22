/**
 * Finds commands by what people type: case and accents do not matter ("version"
 * finds "Versión"), every word typed must start a word of the command's name or of
 * its other names, and the closest matches come first.
 */

export interface Searchable {
  readonly label: string;
  /** Other words the command can be found by. */
  readonly keywords?: readonly string[];
}

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

const wordsOf = (text: string) =>
  normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** How well an item matches the query; null when it does not. Lower is better. */
function rank(item: Searchable, query: string, terms: readonly string[]): number | null {
  const label = normalize(item.label);
  if (label.startsWith(query)) return 0;
  const labelWords = wordsOf(item.label);
  const keywordWords = (item.keywords ?? []).flatMap(wordsOf);
  const inLabel = (term: string) => labelWords.some((word) => word.startsWith(term));
  const inKeywords = (term: string) => keywordWords.some((word) => word.startsWith(term));
  if (terms.every(inLabel)) return 1;
  if (terms.every((term) => inLabel(term) || inKeywords(term))) return 2;
  return null;
}

/** The items that match, best first; all of them, in order, for an empty query. */
export function searchCommands<Item extends Searchable>(
  items: readonly Item[],
  query: string,
): Item[] {
  const normalized = normalize(query.trim());
  if (!normalized) return [...items];
  const terms = wordsOf(normalized);
  return items
    .map((item, index) => ({ item, index, score: rank(item, normalized, terms) }))
    .filter((entry): entry is typeof entry & { score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ item }) => item);
}
