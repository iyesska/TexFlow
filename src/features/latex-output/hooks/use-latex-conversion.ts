"use client";

import { convertResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { requestConversion } from "@/features/conversion/model/request-conversion";

async function convertToLatex(
  markdown: string,
  standalone: boolean,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  const response = await requestConversion(
    "/api/convert",
    { markdown, standalone },
    convertResponseSchema,
    signal,
  );
  if (!response.ok) return response;
  return { ok: true, value: response.latex, warnings: response.warnings };
}

/**
 * The LaTeX for the document, converted on the server and kept up to date.
 * `markdown` is null until the document has loaded.
 */
export function useLatexConversion(
  markdown: string | null,
  standalone: boolean,
): Conversion<string> {
  return useConversion(markdown, standalone ? "document" : "body", (text, signal) =>
    convertToLatex(text, standalone, signal),
  );
}
