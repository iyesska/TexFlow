import "server-only";

import type { z } from "zod";

import type { CompileErrorCode } from "@/contracts/compilation";

import { readJsonBody } from "./read-json";

const STATUS_BY_ERROR: Readonly<Record<CompileErrorCode, number>> = {
  "invalid-request": 400,
  "too-large": 413,
  syntax: 422,
  "limit-exceeded": 422,
  busy: 503,
  unavailable: 503,
  failed: 500,
  "compile-error": 422,
};

interface Failure {
  readonly ok: false;
  readonly error: { readonly code: CompileErrorCode; readonly message: string };
}
type Outcome = { readonly ok: true } | Failure;

export const TOO_LARGE: Failure = {
  ok: false,
  error: {
    code: "too-large",
    message: "El documento es demasiado largo para convertirlo.",
  },
};

export const INVALID: Failure = {
  ok: false,
  error: { code: "invalid-request", message: "La petición no es válida." },
};

/** A JSON answer whose HTTP status follows the outcome's error code. */
export function respond(body: Outcome): Response {
  return Response.json(body, {
    status: body.ok ? 200 : STATUS_BY_ERROR[body.error.code],
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * The shared shape of the conversion endpoints: read a size-capped JSON body, validate
 * it against `schema`, run `handle`, and answer with the matching HTTP status.
 */
export async function handleJsonRoute<Input, Output extends Outcome>(
  request: Request,
  options: {
    readonly schema: z.ZodType<Input>;
    readonly maxBodyBytes: number;
    readonly handle: (input: Input) => Promise<Output>;
  },
): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return respond(INVALID);
  }
  const body = await readJsonBody(request, options.maxBodyBytes);
  if (!body.ok) return respond(body.reason === "too-large" ? TOO_LARGE : INVALID);

  const parsed = options.schema.safeParse(body.value);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === "too_big");
    return respond(tooLong ? TOO_LARGE : INVALID);
  }
  return respond(await options.handle(parsed.data));
}
