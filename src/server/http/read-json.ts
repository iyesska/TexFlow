import "server-only";

export type JsonBody =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: "too-large" | "invalid" };

/**
 * Reads a JSON request body without trusting its declared size: the stream is cut off
 * as soon as it exceeds `maxBytes`, so an oversized upload is never held in memory.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<JsonBody> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    return { ok: false, reason: "too-large" };
  }
  if (!request.body) return { ok: false, reason: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false, reason: "too-large" };
    }
    chunks.push(value);
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
