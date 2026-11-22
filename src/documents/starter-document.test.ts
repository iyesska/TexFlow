import { describe, expect, it } from "vitest";

import { starterDocument } from "./starter-document";
import { deriveTitle, UNTITLED_DOCUMENT } from "./title";

describe("starterDocument", () => {
  it("opens with a metadata block the title is read from", () => {
    const markdown = starterDocument("Ada Martín");
    expect(markdown).toBe(
      `---\ntitle: ${UNTITLED_DOCUMENT}\nauthor: "Ada Martín"\n---\n\n`,
    );
    expect(deriveTitle(markdown)).toBe(UNTITLED_DOCUMENT);
  });

  it("leaves the author out when there is no name", () => {
    expect(starterDocument(null)).not.toContain("author");
  });
});
