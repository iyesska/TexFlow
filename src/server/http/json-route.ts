import "server-only";

import type { z } from "zod";

import type { CompileErrorCode } from "@/contracts/compilation";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import type { RateLimiter } from "@/server/security/rate-limit";

import { isSameOrigin } from "./origin";
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
  unauthorized: 401,
  "rate-limited": 429,
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

export const UNAUTHORIZED: Failure = {
  ok: false,
  error: {
    code: "unauthorized",
    message: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  },
};

export const RATE_LIMITED: Failure = {
  ok: false,
  error: {
    code: "rate-limited",
    message: "Demasiadas peticiones seguidas. Espera unos segundos.",
  },
};

/**
 * The signed-in user, if they still have requests left in `limiter`; otherwise the
 * response to send instead. Converting and compiling run programs on the server, so
 * only signed-in users can, and only so often.
 */
export async function authorizeConversion(
  request: Request,
  limiter: RateLimiter,
): Promise<{ readonly user: SessionUser } | { readonly response: Response }> {
  if (!isSameOrigin(request)) return { response: respond(INVALID) };
  const user = await getSessionUser();
  if (!user) return { response: respond(UNAUTHORIZED) };
  if (!limiter.take(user.id)) return { response: respond(RATE_LIMITED) };
  return { user };
}

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
    readonly limiter: RateLimiter;
    readonly handle: (input: Input) => Promise<Output>;
  },
): Promise<Response> {
  const authorized = await authorizeConversion(request, options.limiter);
  if ("response" in authorized) return authorized.response;
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
