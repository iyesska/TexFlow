import {
  authorsLabel,
  citedKeys,
  entryYear,
  plainText,
  scanBibtex,
  type BibEntry,
  type BibProblem,
} from "@/documents/bibtex";
import type { BibField, BibType } from "@/documents/bibtex-edit";

/** A reference as the bibliography panel lists it. */
export interface Reference {
  readonly key: string;
  readonly type: string;
  readonly title: string;
  /** "Pérez y Gómez", or "" when the entry names no one. */
  readonly authors: string;
  readonly year: string;
  /** Where it was published: journal, book, publisher, school… */
  readonly source: string;
  /** Whether the text cites it. */
  readonly cited: boolean;
  readonly entry: BibEntry;
}

export interface ReferenceList {
  readonly references: readonly Reference[];
  readonly problems: readonly BibProblem[];
  /** Keys the text cites that the bibliography does not have. */
  readonly missing: readonly string[];
}

const SOURCE_FIELDS = [
  "journal",
  "booktitle",
  "publisher",
  "school",
  "institution",
  "howpublished",
  "url",
];

/** The references of a bibliography, with what the panel shows of each. */
export function listReferences(bibtex: string, markdown: string): ReferenceList {
  const { entries, problems } = scanBibtex(bibtex);
  const cited = citedKeys(markdown);
  const known = new Set(entries.map(({ key }) => key));
  return {
    references: entries.map((entry) => {
      const source =
        SOURCE_FIELDS.map((field) => entry.fields[field]).find(Boolean) ?? "";
      return {
        key: entry.key,
        type: entry.type,
        title: plainText(entry.fields.title ?? "") || "Sin título",
        authors: authorsLabel(entry),
        year: entryYear(entry),
        source: plainText(source),
        cited: cited.has(entry.key),
        entry,
      };
    }),
    problems,
    missing: [...cited].filter((key) => !known.has(key)),
  };
}

const searchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

/** The references whose key, title, authors or year contain `query`. */
export function filterReferences(
  references: readonly Reference[],
  query: string,
): readonly Reference[] {
  const needle = searchable(query.trim());
  if (!needle) return references;
  return references.filter((reference) =>
    searchable(
      `${reference.key} ${reference.title} ${reference.authors} ${reference.year}`,
    ).includes(needle),
  );
}

export const TYPE_LABELS: Readonly<Record<BibType, string>> = {
  article: "Artículo de revista",
  book: "Libro",
  inproceedings: "Ponencia en un congreso",
  incollection: "Capítulo de libro",
  phdthesis: "Tesis doctoral",
  mastersthesis: "Trabajo de fin de máster",
  techreport: "Informe técnico",
  online: "Página web",
  misc: "Otro",
};

/** The label of any entry type, including those the form does not offer. */
export function typeLabel(type: string): string {
  return TYPE_LABELS[type as BibType] ?? `@${type}`;
}

export const FIELD_LABELS: Readonly<Record<BibField, string>> = {
  author: "Autores",
  title: "Título",
  journal: "Revista",
  booktitle: "Libro o actas",
  editor: "Editores",
  publisher: "Editorial",
  school: "Universidad",
  institution: "Institución",
  address: "Lugar de publicación",
  edition: "Edición",
  year: "Año",
  volume: "Volumen",
  number: "Número",
  pages: "Páginas",
  isbn: "ISBN",
  doi: "DOI",
  url: "URL",
  urldate: "Consultado el",
  note: "Nota",
};

/** The fields the form shows for each type, the usual ones first. */
export const TYPE_FIELDS: Readonly<Record<BibType, readonly BibField[]>> = {
  article: [
    "author",
    "title",
    "journal",
    "year",
    "volume",
    "number",
    "pages",
    "doi",
    "url",
  ],
  book: [
    "author",
    "title",
    "publisher",
    "year",
    "edition",
    "address",
    "isbn",
    "doi",
    "url",
  ],
  inproceedings: [
    "author",
    "title",
    "booktitle",
    "year",
    "editor",
    "pages",
    "publisher",
    "address",
    "doi",
    "url",
  ],
  incollection: [
    "author",
    "title",
    "booktitle",
    "editor",
    "publisher",
    "year",
    "pages",
    "address",
    "doi",
  ],
  phdthesis: ["author", "title", "school", "year", "address", "url"],
  mastersthesis: ["author", "title", "school", "year", "address", "url"],
  techreport: ["author", "title", "institution", "year", "number", "address", "url"],
  online: ["author", "title", "url", "year", "urldate", "note"],
  misc: ["author", "title", "year", "note", "url"],
};
