// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { previewResponseSchema } from "@/contracts/conversion";
import { LIMITS } from "@/config/limits";
import { signInAs, TEST_USER } from "@/server/testing/session-mock";

import { POST } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

beforeEach(() => signInAs(TEST_USER));

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/preview", () => {
  it("answers 401 without a session", async () => {
    signInAs(null);
    expect((await post({ markdown: "# Hola" })).status).toBe(401);
  });

  it("returns the HTML for a valid request", async () => {
    const response = await post({ markdown: "# Hola" });
    expect(response.status).toBe(200);
    const result = previewResponseSchema.parse(await response.json());
    expect(result.ok && result.html).toContain("Hola</h1>");
  });

  it("rejects a missing document and an oversized one", async () => {
    expect((await post({})).status).toBe(400);
    expect(
      (await post({ markdown: "a".repeat(LIMITS.maxMarkdownLength + 1) })).status,
    ).toBe(413);
  });
});
