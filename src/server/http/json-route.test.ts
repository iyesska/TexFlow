// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createRateLimiter } from "@/server/security/rate-limit";
import { signInAs, TEST_USER } from "@/server/testing/session-mock";

import { handleJsonRoute } from "./json-route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

function request(): Request {
  return new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: 1 }),
  });
}

describe("handleJsonRoute", () => {
  it("answers 429 once a user has used up their allowance, and only for them", async () => {
    const options = {
      schema: z.object({ value: z.number() }),
      maxBodyBytes: 100,
      limiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
      handle: async () => ({ ok: true as const }),
    };
    signInAs(TEST_USER);
    expect((await handleJsonRoute(request(), options)).status).toBe(200);

    const limited = await handleJsonRoute(request(), options);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ error: { code: "rate-limited" } });

    signInAs({ ...TEST_USER, id: "otheruser0000001" });
    expect((await handleJsonRoute(request(), options)).status).toBe(200);
  });
});
