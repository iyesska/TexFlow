// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { convertResponseSchema } from "@/contracts/conversion";
import { LIMITS } from "@/config/limits";
import { signInAs, TEST_USER } from "@/server/testing/session-mock";

import { POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

beforeEach(() => signInAs(TEST_USER));

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function parsed(response: Response) {
  return convertResponseSchema.parse(await response.json());
}

describe("POST /api/convert", () => {
  it("answers 401 without a session, before reading the body", async () => {
    signInAs(null);
    const response = await post(
      { markdown: "# Hola" },
      { "content-length": "999999999" },
    );
    expect(response.status).toBe(401);
    expect(await parsed(response)).toMatchObject({ error: { code: "unauthorized" } });
  });

  it("returns the LaTeX for a valid request", async () => {
    const response = await post({ markdown: "# Hola", standalone: false });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await parsed(response);
    expect(result.ok && result.latex).toContain("\\section{Hola}");
  });

  it("defaults to a complete document", async () => {
    const result = await parsed(await post({ markdown: "x" }));
    expect(result.ok && result.latex).toContain("\\documentclass");
  });

  it.each([
    ["a body that is not JSON", "{nope"],
    ["a missing document", { standalone: true }],
    ["a document that is not text", { markdown: 42 }],
    ["an option of the wrong type", { markdown: "x", standalone: "yes" }],
  ])("rejects %s", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await parsed(response)).toMatchObject({ error: { code: "invalid-request" } });
  });

  it("rejects a request that is not JSON", async () => {
    const response = await post("markdown=x", { "content-type": "text/plain" });
    expect(response.status).toBe(400);
  });

  it("rejects a document over the limit", async () => {
    const response = await post({ markdown: "a".repeat(LIMITS.maxMarkdownLength + 1) });
    expect(response.status).toBe(413);
    expect(await parsed(response)).toMatchObject({ error: { code: "too-large" } });
  });

  it("rejects an oversized body from its declared length, without reading it", async () => {
    const response = await post({ markdown: "x" }, { "content-length": "999999999" });
    expect(response.status).toBe(413);
  });

  it("answers a syntax error with 422 and the line", async () => {
    const response = await post({ markdown: "---\ntitle: [a\n---\n" });
    expect(response.status).toBe(422);
    expect(await parsed(response)).toMatchObject({ error: { code: "syntax", line: 2 } });
  });
});
