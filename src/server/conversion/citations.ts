import "server-only";

import type { JobFile } from "@/server/sandbox/run-process";
import type { DocumentSettings, Language } from "@/templates/settings";

import { pandocResource } from "./pandoc";

/** Where the bibliography is written in the job's directory. */
export const BIBLIOGRAPHY_FILE = "references.bib";

const REFERENCES_TITLE: Readonly<Record<Language, string>> = {
  es: "Referencias",
  en: "References",
};

export interface CitationSetup {
  readonly options: string[];
  readonly files: JobFile[];
}

/**
 * What Pandoc needs to format citations: the bibliography as a file of the job, the
 * citation style, and the language of the words it writes ("y", "et al.", the title
 * of the list of references). Nothing when the document cites nothing.
 *
 * The bibliography is the writer's text, but it only ever becomes a file in the job's
 * own directory; Pandoc reads it as BibTeX, never as LaTeX to run.
 */
export function citationSetup(
  bibliography: string | undefined,
  settings: DocumentSettings,
): CitationSetup {
  if (!bibliography?.trim()) return { options: [], files: [] };
  const style =
    settings.citationStyle === "chicago-author-date"
      ? [] // Pandoc's own default.
      : [`--csl=${pandocResource("csl", `${settings.citationStyle}.csl`)}`];
  return {
    options: [
      "--citeproc",
      `--bibliography=${BIBLIOGRAPHY_FILE}`,
      ...style,
      // Metadata, not a variable: it is what tells citeproc the language.
      `--metadata=lang:${settings.language}`,
      `--metadata=reference-section-title:${REFERENCES_TITLE[settings.language]}`,
      "--metadata=link-citations:true",
    ],
    files: [{ name: BIBLIOGRAPHY_FILE, data: bibliography }],
  };
}
