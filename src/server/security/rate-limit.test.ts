// @vitest-environment node
import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit in a window, then refuses until it passes", () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => time });
    expect([1, 2, 3, 4].map(() => limiter.take("a"))).toEqual([true, true, true, false]);
    expect(limiter.take("b")).toBe(true);
    time = 1000;
    expect(limiter.take("a")).toBe(true);
  });

  it("forgets a key on reset", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    limiter.take("a");
    expect(limiter.take("a")).toBe(false);
    limiter.reset("a");
    expect(limiter.take("a")).toBe(true);
  });
});
