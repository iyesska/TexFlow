"use client";

import { convertResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { settingsKey, type DocumentSettings } from "@/templates/settings";

async function convertToLatex(
  markdown: string,
  standalone: boolean,
  settings: DocumentSettings,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  const response = await requestConversion(
    "/api/convert",
    { markdown, standalone, settings },
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
): Conversion<string> {
  const variant = `${standalone ? "document" : "body"}:${settingsKey(settings)}`;
  return useConversion(markdown, variant, (text, signal) =>
    convertToLatex(text, standalone, settings, signal),
  );
}
