import { describe, expect, it } from "vitest";

import { countWords } from "./document";

describe("countWords", () => {
  it("counts words and skips bare markup", () => {
    expect(countWords("# Título\n\n- uno\n- dos **tres**\n\n---")).toBe(4);
    expect(countWords("")).toBe(0);
  });
});
