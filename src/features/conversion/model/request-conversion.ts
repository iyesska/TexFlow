import type { z } from "zod";

import type { ConversionError, ConversionFailure } from "@/contracts/conversion";
import { LIMITS } from "@/config/limits";

const failure = (error: ConversionError): ConversionFailure => ({ ok: false, error });

/**
 * Posts a document to a conversion endpoint and validates the answer against
 * `responseSchema`. Always resolves: network trouble and malformed answers come back
 * as errors the interface can show.
 */
export async function requestConversion<Schema extends z.ZodType>(
  url: string,
  body: { readonly markdown: string } & Readonly<Record<string, unknown>>,
  responseSchema: Schema,
  signal: AbortSignal,
): Promise<z.infer<Schema> | ConversionFailure> {
  if (body.markdown.length > LIMITS.maxMarkdownLength) {
    return failure({
      code: "too-large",
      message: "El documento es demasiado largo para convertirlo.",
    });
  }

  let payload: unknown;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    payload = await response.json();
  } catch {
    return failure({
      code: "unavailable",
      message: "No se pudo contactar con el servidor. Comprueba tu conexión.",
    });
  }

  const parsed = responseSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return failure({
    code: "failed",
    message: "El servidor devolvió una respuesta inesperada.",
  });
}
