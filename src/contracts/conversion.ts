import { z } from "zod";

import { LIMITS } from "@/config/limits";
import { DEFAULT_SETTINGS } from "@/templates/catalog";
import { documentSettingsSchema } from "@/templates/settings";

/** Design settings in a request. Omitted, the document gets the default template. */
export const requestSettingsSchema = documentSettingsSchema.default(DEFAULT_SETTINGS);

/**
 * The contracts of POST /api/convert and POST /api/preview, shared by the route
 * handlers and the client so both sides validate the same shapes.
 */

export const convertRequestSchema = z.object({
  markdown: z.string().max(LIMITS.maxMarkdownLength),
  /** A complete, compilable document (true) or only the body to paste elsewhere. */
  standalone: z.boolean().default(true),
  settings: requestSettingsSchema,
});

export type ConvertRequest = z.infer<typeof convertRequestSchema>;

export const CONVERSION_ERROR_CODES = [
  "invalid-request",
  "too-large",
  "syntax",
  "limit-exceeded",
  "busy",
  "unavailable",
  "failed",
  "unauthorized",
  "rate-limited",
] as const;

export type ConversionErrorCode = (typeof CONVERSION_ERROR_CODES)[number];

const conversionErrorSchema = z.object({
  code: z.enum(CONVERSION_ERROR_CODES),
  /** What went wrong and what to do about it, ready to show to the writer. */
  message: z.string(),
  /** The converter's own words, when they help locate the problem. */
  detail: z.string().optional(),
  line: z.number().int().positive().optional(),
});

export type ConversionError = z.infer<typeof conversionErrorSchema>;

export const convertResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    latex: z.string(),
    warnings: z.array(z.string()),
  }),
  z.object({ ok: z.literal(false), error: conversionErrorSchema }),
]);

export type ConvertResponse = z.infer<typeof convertResponseSchema>;

/** A failed conversion, whichever endpoint it came from. */
export interface ConversionFailure {
  readonly ok: false;
  readonly error: ConversionError;
}

/** Prefix of every element id in the preview, so none collides with the app's own. */
export const PREVIEW_ID_PREFIX = "pv-";

export const previewRequestSchema = z.object({
  markdown: z.string().max(LIMITS.maxMarkdownLength),
  settings: requestSettingsSchema,
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;

export const previewResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    /**
     * An HTML fragment as Pandoc wrote it. It is NOT safe to insert as is: the
     * client sanitizes it before it reaches the page.
     */
    html: z.string(),
    warnings: z.array(z.string()),
  }),
  z.object({ ok: z.literal(false), error: conversionErrorSchema }),
]);

export type PreviewResponse = z.infer<typeof previewResponseSchema>;
