"use client";

import { previewResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { bibliographyFor } from "@/documents/bibtex";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { fingerprint } from "@/lib/fingerprint";
import { settingsKey, type DocumentSettings } from "@/templates/settings";

async function requestPreview(
  markdown: string,
  settings: DocumentSettings,
  bibliography: string,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  const references = bibliographyFor(markdown, bibliography);
  const response = await requestConversion(
    "/api/preview",
    { markdown, settings, ...(references ? { bibliography: references } : {}) },
    previewResponseSchema,
    signal,
  );
  if (!response.ok) return response;
  return { ok: true, value: response.html, warnings: response.warnings };
}

/**
 * The document rendered to HTML on the server, kept up to date. The HTML is
 * untrusted until it has been sanitized. `markdown` is null until the document loads.
 *
 * Only a few settings change the markup (numbering, contents, language); the rest are
 * styling. Any change asks again all the same: it is cheap and keeps that knowledge
 * on the server.
 */
export function usePreviewHtml(
  markdown: string | null,
  settings: DocumentSettings,
  bibliography: string,
): Conversion<string> {
  const variant = `${settingsKey(settings)}:${fingerprint(bibliography)}`;
  return useConversion(markdown, variant, (text, signal) =>
    requestPreview(text, settings, bibliography, signal),
  );
}
