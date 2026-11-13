import { z } from "zod";

import { LIMITS } from "@/config/limits";

/**
 * The contract of POST /api/convert, shared by the route handler and the client so
 * both sides validate the same shapes.
 */

export const convertRequestSchema = z.object({
  markdown: z.string().max(LIMITS.maxMarkdownLength),
  /** A complete, compilable document (true) or only the body to paste elsewhere. */
  standalone: z.boolean().default(true),
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
