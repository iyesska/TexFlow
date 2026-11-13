import {
  convertResponseSchema,
  type ConversionError,
  type ConvertRequest,
  type ConvertResponse,
} from "@/contracts/convert";
import { LIMITS } from "@/config/limits";

const failure = (error: ConversionError): ConvertResponse => ({ ok: false, error });

/**
 * Asks the server to convert a document. Always resolves: network trouble and
 * malformed answers come back as errors the interface can show.
 */
export async function requestConversion(
  request: ConvertRequest,
  signal: AbortSignal,
): Promise<ConvertResponse> {
  if (request.markdown.length > LIMITS.maxMarkdownLength) {
    return failure({
      code: "too-large",
      message: "El documento es demasiado largo para convertirlo.",
    });
  }

  let payload: unknown;
  try {
    const response = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    payload = await response.json();
  } catch {
    return failure({
      code: "unavailable",
      message: "No se pudo contactar con el servidor. Comprueba tu conexión.",
    });
  }

  const parsed = convertResponseSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return failure({
    code: "failed",
    message: "El servidor devolvió una respuesta inesperada.",
  });
}
