// @vitest-environment node
import { describe, expect, it } from "vitest";

import { readBodyBytes } from "./read-body";

function streamingRequest(body: ReadableStream<Uint8Array>): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
}

describe("readBodyBytes", () => {
  it("reads a body up to the limit, and stops past it", async () => {
    const small = new Request("http://localhost/api/x", { method: "POST", body: "hola" });
    expect(await readBodyBytes(small, 10)).toEqual({ bytes: Buffer.from("hola") });
    const large = new Request("http://localhost/api/x", {
      method: "POST",
      body: "a".repeat(11),
    });
    expect(await readBodyBytes(large, 10)).toEqual({ reason: "too-large" });
  });

  it("treats a body the client cut off as missing", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.error(new Error("aborted"));
      },
    });
    expect(await readBodyBytes(streamingRequest(body), 100)).toEqual({
      reason: "missing",
    });
  });
});
