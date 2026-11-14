import { describe, expect, it } from "vitest";

import { initials } from "./account";

describe("initials", () => {
  it("takes the first and last names' initials", () => {
    expect(initials({ name: "Ada Augusta Lovelace", email: null })).toBe("AL");
    expect(initials({ name: "ángela", email: null })).toBe("Á");
  });

  it("falls back to the email address, then to a question mark", () => {
    expect(initials({ name: "  ", email: "zoe@example.com" })).toBe("Z");
    expect(initials({ name: null, email: null })).toBe("?");
  });
});
