import "server-only";

import { readBodyBytes } from "./read-body";

export type JsonBody =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly reason: "too-large" | "invalid" };

/** Reads a size-capped JSON request body. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<JsonBody> {
  const body = await readBodyBytes(request, maxBytes);
  if ("reason" in body) {
    return { ok: false, reason: body.reason === "too-large" ? "too-large" : "invalid" };
  }
  try {
    return { ok: true, value: JSON.parse(body.bytes.toString("utf8")) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
