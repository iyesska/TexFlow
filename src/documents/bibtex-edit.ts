import { familyNames, plainText, scanBibtex } from "./bibtex";

/**
 * Writing BibTeX: new entries from a form, and changes to the text that leave the
 * rest of it exactly as the writer had it.
 */

export const BIB_TYPES = [
  "article",
  "book",
  "inproceedings",
  "incollection",
  "phdthesis",
  "mastersthesis",
  "techreport",
  "online",
  "misc",
] as const;

export type BibType = (typeof BIB_TYPES)[number];

export const BIB_FIELDS = [
  "author",
  "title",
  "journal",
  "booktitle",
  "editor",
  "publisher",
  "school",
  "institution",
  "address",
  "edition",
  "year",
  "volume",
  "number",
  "pages",
  "isbn",
  "doi",
  "url",
  "urldate",
  "note",
] as const;

export type BibField = (typeof BIB_FIELDS)[number];

/** Fields whose value is a code or an address, written exactly as given. */
const VERBATIM: ReadonlySet<BibField> = new Set(["doi", "url", "urldate", "isbn"]);

export interface NewEntry {
  readonly type: BibType;
  readonly key: string;
  readonly fields: Partial<Record<BibField, string>>;
}

/** A key BibTeX and Pandoc accept: letters, digits and a few joiners, no spaces. */
export const KEY_PATTERN = /^[\p{L}\p{N}_][\p{L}\p{N}_:.\-+/]*$/u;

/** Braces that do not pair up would swallow the rest of the file: they are dropped. */
function balanced(value: string): string {
  let depth = 0;
  for (const char of value) {
    if (char === "{") depth++;
    else if (char === "}" && --depth < 0) return value.replace(/[{}]/g, "");
  }
  return depth === 0 ? value : value.replace(/[{}]/g, "");
}

/** LaTeX's special characters, escaped where a field is read as LaTeX. */
function escapeLatex(value: string): string {
  return value.replace(/(?<!\\)([&%#_])/g, "\\$1");
}

/**
 * The BibTeX text of an entry, one field per line, in the usual order. `extra` keeps
 * fields the form does not offer (keywords, abstract…) as they were written.
 */
export function serializeEntry(
  entry: NewEntry,
  extra: Readonly<Record<string, string>> = {},
): string {
  const known: ReadonlySet<string> = new Set(BIB_FIELDS);
  const lines = BIB_FIELDS.flatMap((field) => {
    const raw = entry.fields[field]?.trim();
    if (!raw) return [];
    const value = VERBATIM.has(field)
      ? raw.replace(/[{}]/g, "")
      : balanced(escapeLatex(raw));
    return [`  ${field} = {${value}}`];
  });
  for (const [field, value] of Object.entries(extra)) {
    if (!known.has(field) && value.trim())
      lines.push(`  ${field} = {${balanced(value)}}`);
  }
  return `@${entry.type}{${entry.key},\n${lines.join(",\n")}\n}`;
}

/** "Pérez, Ana" and "Juan Gómez" on separate lines, as BibTeX joins them. */
export function joinAuthors(lines: string): string {
  return lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" and ");
}

/** The opposite of joinAuthors, for editing: one author per line. */
export function splitAuthors(field: string): string {
  return field
    .split(/\s+and\s+/i)
    .map((name) => name.trim())
    .join("\n");
}

const ascii = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Words too common to tell a title apart, in Spanish and English. */
const STOP_WORDS = new Set([
  "las",
  "los",
  "una",
  "del",
  "con",
  "sin",
  "por",
  "para",
  "sobre",
  "the",
  "and",
  "for",
  "with",
  "from",
]);

/**
 * A key in the usual shape, family name, year and first word of the title
 * ("perez2020convergencia"), made unique with a letter when it is taken.
 */
export function suggestKey(
  fields: Partial<Record<BibField, string>>,
  taken: ReadonlySet<string>,
): string {
  const family =
    ascii(familyNames(fields.author ?? fields.editor ?? "")[0] ?? "") || "ref";
  const year = /\d{4}/.exec(fields.year ?? "")?.[0] ?? "";
  const word =
    plainText(fields.title ?? "")
      .split(/\s+/)
      .map(ascii)
      .find((candidate) => candidate.length > 2 && !STOP_WORDS.has(candidate)) ?? "";
  const base = `${family}${year}${word}`;
  if (!taken.has(base)) return base;
  for (const suffix of "abcdefghijklmnopqrstuvwxyz") {
    if (!taken.has(`${base}${suffix}`)) return `${base}${suffix}`;
  }
  let number = 2;
  while (taken.has(`${base}${number}`)) number++;
  return `${base}${number}`;
}

/** The text with the entry for `key` replaced by `entry`; unchanged if there is none. */
export function replaceEntry(bibtex: string, key: string, entry: string): string {
  const found = scanBibtex(bibtex).entries.find((candidate) => candidate.key === key);
  if (!found) return bibtex;
  return bibtex.slice(0, found.start) + entry + bibtex.slice(found.end);
}

/** The text without the entry for `key`, and without the blank lines it leaves. */
export function removeEntry(bibtex: string, key: string): string {
  const found = scanBibtex(bibtex).entries.find((candidate) => candidate.key === key);
  if (!found) return bibtex;
  const before = bibtex.slice(0, found.start).replace(/\s*$/, "");
  const after = bibtex.slice(found.end).replace(/^\s*/, "");
  if (!before) return after;
  return after ? `${before}\n\n${after}` : `${before}\n`;
}

/** `addition` after the existing text, separated by a blank line. */
export function appendEntries(bibtex: string, addition: string): string {
  const existing = bibtex.replace(/\s*$/, "");
  const added = addition.trim();
  if (!existing) return `${added}\n`;
  return `${existing}\n\n${added}\n`;
}
