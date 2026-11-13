"use client";

import { previewResponseSchema } from "@/contracts/conversion";
import {
  useConversion,
  type Conversion,
  type ConversionOutcome,
} from "@/features/conversion/hooks/use-conversion";
import { requestConversion } from "@/features/conversion/model/request-conversion";
import { settingsKey, type DocumentSettings } from "@/templates/settings";

async function requestPreview(
  markdown: string,
  settings: DocumentSettings,
  signal: AbortSignal,
): Promise<ConversionOutcome<string>> {
  const response = await requestConversion(
    "/api/preview",
    { markdown, settings },
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
): Conversion<string> {
  return useConversion(markdown, settingsKey(settings), (text, signal) =>
    requestPreview(text, settings, signal),
  );
}
