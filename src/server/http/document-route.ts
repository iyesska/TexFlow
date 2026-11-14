import "server-only";

import type { z } from "zod";

import { LIMITS } from "@/config/limits";
import { ACCOUNT_LIMITS, idSchema, type DocumentErrorCode } from "@/contracts/documents";
import { getSessionUser, type SessionUser } from "@/server/auth/session";
import type { RateLimiter } from "@/server/security/rate-limit";

import { isSafeMethod, isSameOrigin } from "./origin";
import { readJsonBody } from "./read-json";

/** Helpers for the routes that read and change a signed-in user's documents. */

/** A document's text plus its settings and the JSON around them. */
export const DOCUMENT_REQUEST_BYTES = LIMITS.maxDocumentBodyBytes + 16 * 1024;

const STATUS: Readonly<Record<DocumentErrorCode, number>> = {
  "invalid-request": 400,
  "too-large": 413,
  unauthorized: 401,
  "not-found": 404,
  conflict: 409,
  "folder-not-found": 422,
  "name-taken": 409,
  "unsupported-type": 415,
  "too-many": 422,
  "rate-limited": 429,
};

const MESSAGES: Readonly<Record<DocumentErrorCode, string>> = {
  "invalid-request": "La petición no es válida.",
  "too-large": "El contenido es demasiado grande.",
  unauthorized: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "not-found": "No se encontró el documento.",
  conflict: "El documento ha cambiado en otra pestaña o dispositivo.",
  "folder-not-found": "No se encontró la carpeta.",
  "name-taken": "Ya tienes una carpeta con ese nombre.",
  "unsupported-type": "Solo se admiten imágenes PNG y JPEG.",
  "too-many": "El documento ya tiene el máximo de imágenes.",
  "rate-limited": "Demasiadas peticiones seguidas. Espera un momento.",
};

export const TOO_MANY_DOCUMENTS = `Has llegado al máximo de ${ACCOUNT_LIMITS.maxDocuments} documentos. Borra alguno para crear otro.`;
export const TOO_MANY_FOLDERS = `Has llegado al máximo de ${ACCOUNT_LIMITS.maxFolders} carpetas.`;

const NO_STORE = { "Cache-Control": "no-store" };

export function errorResponse(
  code: DocumentErrorCode,
  extra: { readonly message?: string; readonly revision?: number } = {},
): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message: extra.message ?? MESSAGES[code],
        ...(extra.revision === undefined ? {} : { revision: extra.revision }),
      },
    },
    { status: STATUS[code], headers: NO_STORE },
  );
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export const noContent = (): Response =>
  new Response(null, { status: 204, headers: NO_STORE });

/**
 * Runs `handle` for the signed-in user, or answers 401. The user comes from the
 * session, never from the request. Changes must come from the application's own pages
 * and, with a `limiter`, count against the user's allowance.
 */
export async function withUser(
  request: Request,
  handle: (user: SessionUser) => Promise<Response>,
  options: { readonly limiter?: RateLimiter } = {},
): Promise<Response> {
  if (!isSafeMethod(request.method) && !isSameOrigin(request)) {
    return errorResponse("invalid-request", { message: "Origen no permitido." });
  }
  const user = await getSessionUser();
  if (!user) return errorResponse("unauthorized");
  if (options.limiter && !options.limiter.take(user.id)) {
    return errorResponse("rate-limited");
  }
  return handle(user);
}

/** A route's `[id]` parameter, if it has the shape of an id. */
export function parseId(value: string): string | null {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Reads and validates a JSON body; answers 400 or 413 itself when it cannot. */
export async function readRequest<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  maxBytes: number,
): Promise<
  | { readonly ok: true; readonly value: z.output<Schema> }
  | { readonly ok: false; readonly response: Response }
> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: errorResponse("invalid-request") };
  }
  const body = await readJsonBody(request, maxBytes);
  if (!body.ok) {
    return {
      ok: false,
      response: errorResponse(
        body.reason === "too-large" ? "too-large" : "invalid-request",
      ),
    };
  }
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    const tooLong = parsed.error.issues.some((issue) => issue.code === "too_big");
    return {
      ok: false,
      response: errorResponse(
        tooLong ? "too-large" : "invalid-request",
        message ? { message } : {},
      ),
    };
  }
  return { ok: true, value: parsed.data };
}
