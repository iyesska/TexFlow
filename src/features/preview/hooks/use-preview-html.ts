"use client";

import { previewResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { requestConversion } from "@/features/conversion/model/request-conversion";

async function requestPreview(
  markdown: string,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  const response = await requestConversion(
    "/api/preview",
    { markdown },
    previewResponseSchema,
    signal,
  );
  if (!response.ok) return response;
  return { ok: true, value: response.html, warnings: response.warnings };
}

/**
 * The document rendered to HTML on the server, kept up to date. The HTML is
 * untrusted until it has been sanitized. `markdown` is null until the document loads.
 */
export function usePreviewHtml(markdown: string | null): Conversion<string> {
  return useConversion(markdown, "preview", requestPreview);
}
