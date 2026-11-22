import { describe, expect, it } from "vitest";

import { SAMPLE_DOCUMENT, welcomeDocument } from "./sample-document";

describe("welcomeDocument", () => {
  it("signs the sample with the user's name, as a quoted YAML string", () => {
    expect(welcomeDocument("Ada Lovelace")).toContain('author: "Ada Lovelace"');
    expect(welcomeDocument('Ada "la condesa"\nx')).toContain(
      'author: "Ada  la condesa  x"',
    );
  });

  it("keeps the placeholder without a name", () => {
    expect(welcomeDocument(null)).toBe(SAMPLE_DOCUMENT);
    expect(welcomeDocument("   ")).toBe(SAMPLE_DOCUMENT);
  });
});
