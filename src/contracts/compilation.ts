import { z } from "zod";

import { CONVERSION_ERROR_CODES } from "./conversion";

/**
 * The contract of POST /api/compile.
 *
 * Request: multipart/form-data with one `markdown` field, an optional `settings` field
 * (the design settings as JSON) and one `image` file per image the document uses,
 * named as the Markdown refers to it.
 * Success: the PDF itself (application/pdf), with any warnings in a header.
 * Failure: JSON matching `compileFailureSchema`.
 */

export const COMPILE_FIELDS = {
  markdown: "markdown",
  image: "image",
  /** The design settings as JSON. Optional: the default template otherwise. */
  settings: "settings",
} as const;

/** Carries the warnings of a successful compile: URI-encoded JSON of diagnostics. */
export const COMPILE_WARNINGS_HEADER = "X-Texflow-Warnings";

export const diagnosticSchema = z.object({
  severity: z.enum(["error", "warning"]),
  /** What is wrong and how to fix it, for someone who does not know LaTeX. */
  message: z.string(),
  /** The engine's own words. */
  detail: z.string().optional(),
  /** Line in the generated LaTeX. */
  latexLine: z.number().int().positive().optional(),
  /** Line in the Markdown, when it could be traced back. */
  markdownLine: z.number().int().positive().optional(),
  /** The LaTeX source line the engine pointed at. */
  excerpt: z.string().optional(),
});

export type Diagnostic = z.infer<typeof diagnosticSchema>;

export const diagnosticsSchema = z.array(diagnosticSchema);

export const COMPILE_ERROR_CODES = [...CONVERSION_ERROR_CODES, "compile-error"] as const;

export type CompileErrorCode = (typeof COMPILE_ERROR_CODES)[number];

export const compileFailureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum(COMPILE_ERROR_CODES),
    message: z.string(),
    detail: z.string().optional(),
    line: z.number().int().positive().optional(),
    /** For `compile-error`: what the LaTeX engine reported. */
    diagnostics: diagnosticsSchema.optional(),
  }),
});

export type CompileFailure = z.infer<typeof compileFailureSchema>;
