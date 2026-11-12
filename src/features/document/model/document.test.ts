import { describe, expect, it } from "vitest";

import { countWords, deriveTitle, UNTITLED_DOCUMENT } from "./document";

describe("deriveTitle", () => {
  it("uses the first heading, whatever its level", () => {
    expect(deriveTitle("Intro\n\n## Métodos\n\n# Otro")).toBe("Métodos");
  });

  it("strips inline markup and closing hashes", () => {
    expect(deriveTitle("# **Teoría** de `grafos` ##")).toBe("Teoría de grafos");
  });

  it("ignores headings inside code fences", () => {
    expect(deriveTitle("```sh\n# comentario\n```\n\n# Real")).toBe("Real");
  });

  it("falls back when there is no heading", () => {
    expect(deriveTitle("solo texto")).toBe(UNTITLED_DOCUMENT);
    expect(deriveTitle("")).toBe(UNTITLED_DOCUMENT);
  });
});

describe("countWords", () => {
  it("counts words and skips bare markup", () => {
    expect(countWords("# Título\n\n- uno\n- dos **tres**\n\n---")).toBe(4);
    expect(countWords("")).toBe(0);
  });
});
