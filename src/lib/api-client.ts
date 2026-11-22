import type { z } from "zod";

import { documentErrorSchema, type DocumentErrorCode } from "@/contracts/documents";

/**
 * Calls the application's own JSON API from the browser. Always resolves: network
 * trouble and unexpected answers come back as failures with a message for the user.
 */

export type ApiFailure = {
  readonly ok: false;
  /** The API's error code, or "network" when no answer arrived. */
  readonly code: DocumentErrorCode | "network" | "unexpected";
  readonly message: string;
  /** For a conflict: the revision now stored. */
  readonly revision?: number;
};

export type ApiResult<Value> = { readonly ok: true; readonly value: Value } | ApiFailure;

const NETWORK: ApiFailure = {
  ok: false,
  code: "network",
  message: "No se pudo contactar con el servidor. Comprueba tu conexión.",
};

const UNEXPECTED: ApiFailure = {
  ok: false,
  code: "unexpected",
  message: "El servidor devolvió una respuesta inesperada.",
};

interface CallOptions {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly json?: unknown;
  readonly body?: FormData;
  /** Lets the request finish after the page is closed. Bodies up to 64 KB only. */
  readonly keepalive?: boolean;
  readonly signal?: AbortSignal;
}

/** The part of a successful answer the caller needs; an empty answer is unexpected. */
export function unwrap<Shape, Value>(
  result: ApiResult<Shape | null>,
  pick: (shape: Shape) => Value,
): ApiResult<Value> {
  if (!result.ok) return result;
  if (result.value === null) return UNEXPECTED;
  return { ok: true, value: pick(result.value) };
}

export async function callApi<Value>(
  url: string,
  options: CallOptions,
  schema: z.ZodType<Value> | null,
): Promise<ApiResult<Value | null>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: options.json === undefined ? {} : { "content-type": "application/json" },
      body: options.json === undefined ? options.body : JSON.stringify(options.json),
      keepalive: options.keepalive,
      signal: options.signal,
    });
  } catch {
    return NETWORK;
  }

  if (response.status === 204) return { ok: true, value: null };
  const json: unknown = await response.json().catch(() => null);
  if (response.ok) {
    if (schema === null) return { ok: true, value: null };
    const parsed = schema.safeParse(json);
    return parsed.success ? { ok: true, value: parsed.data } : UNEXPECTED;
  }
  const error = documentErrorSchema.safeParse(json);
  if (!error.success) return UNEXPECTED;
  return {
    ok: false,
    code: error.data.error.code,
    message: error.data.error.message,
    ...(error.data.error.revision === undefined
      ? {}
      : { revision: error.data.error.revision }),
  };
}
