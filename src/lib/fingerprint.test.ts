import { describe, expect, it } from "vitest";

import { fingerprint } from "./fingerprint";

describe("fingerprint", () => {
  it("is stable for a text and changes with it", () => {
    expect(fingerprint("@book{a}")).toBe(fingerprint("@book{a}"));
    expect(fingerprint("@book{a}")).not.toBe(fingerprint("@book{b}"));
    expect(fingerprint("")).toBe(fingerprint(""));
  });
});
