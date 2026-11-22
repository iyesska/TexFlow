import "server-only";

/**
 * Reads a request body without trusting its declared size: the stream is cut off as
 * soon as it exceeds `maxBytes`, so an oversized upload is never held in memory.
 * Returns null when the body is missing or too large.
 */
export async function readBodyBytes(
  request: Request,
  maxBytes: number,
): Promise<{ bytes: Buffer } | { reason: "too-large" | "missing" }> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    return { reason: "too-large" };
  }
  if (!request.body) return { reason: "missing" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    // The client went away mid-upload (a newer request replaced this one): there is
    // no body, and no one left to answer.
    return { reason: "missing" };
  }
  return { bytes: Buffer.concat(chunks) };
}
