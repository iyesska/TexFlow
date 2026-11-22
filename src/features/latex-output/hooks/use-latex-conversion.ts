"use client";

import { convertResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { bibliographyFor } from "@/documents/bibtex";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { fingerprint } from "@/lib/fingerprint";
import { settingsKey, type DocumentSettings } from "@/templates/settings";

async function convertToLatex(
  markdown: string,
  standalone: boolean,
  settings: DocumentSettings,
  bibliography: string,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  // Only the entries the text cites travel with it.
  const references = bibliographyFor(markdown, bibliography);
  const response = await requestConversion(
    "/api/convert",
    {
      markdown,
      standalone,
      settings,
      ...(references ? { bibliography: references } : {}),
    },
    convertResponseSchema,
    signal,
  );
  if (!response.ok) return response;
  return { ok: true, value: response.latex, warnings: response.warnings };
}

/**
 * The LaTeX for the document, laid out by its design settings, converted on the
 * server and kept up to date. `markdown` is null until the document has loaded.
 */
export function useLatexConversion(
  markdown: string | null,
  standalone: boolean,
  settings: DocumentSettings,
  bibliography: string,
): Conversion<string> {
  const variant = `${standalone ? "document" : "body"}:${settingsKey(settings)}:${fingerprint(bibliography)}`;
  return useConversion(markdown, variant, (text, signal) =>
    convertToLatex(text, standalone, settings, bibliography, signal),
  );
}
