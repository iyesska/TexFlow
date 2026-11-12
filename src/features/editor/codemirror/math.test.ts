import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { markdownSupport } from "./language";

/** Text of every node with the given name, in document order. */
function nodes(doc: string, name: string): string[] {
  const state = EditorState.create({ doc, extensions: [markdownSupport()] });
  const tree = ensureSyntaxTree(state, doc.length, 5000);
  if (!tree) throw new Error("The document did not finish parsing.");
  const found: string[] = [];
  tree.iterate({
    enter(node) {
      if (node.name === name) found.push(doc.slice(node.from, node.to));
    },
  });
  return found;
}

describe("math syntax", () => {
  it("recognises inline math", () => {
    expect(nodes("Euler: $e^{i\\pi} + 1 = 0$ es famosa.", "InlineMath")).toEqual([
      "$e^{i\\pi} + 1 = 0$",
    ]);
  });

  it("leaves prices and lone dollars as text", () => {
    expect(nodes("Cuesta $5 y luego $10 más.", "InlineMath")).toEqual([]);
    expect(nodes("Un $ suelto y otro $ más.", "InlineMath")).toEqual([]);
  });

  it("ignores escaped dollars inside and outside formulas", () => {
    expect(nodes("\\$no\\$ pero $a\\$b$ sí", "InlineMath")).toEqual(["$a\\$b$"]);
  });

  it("does not treat emphasis markers inside math as emphasis", () => {
    expect(nodes("$a_i * b_j$ y $c_k * d$", "Emphasis")).toEqual([]);
  });

  it("recognises display math on one line", () => {
    expect(nodes("Sea $$x^2$$ entonces", "BlockMath")).toEqual(["$$x^2$$"]);
  });

  it("recognises a display block spanning lines, blank ones included", () => {
    const block = "$$\na = b\n\n+ c\n$$";
    expect(nodes(`Antes\n\n${block}\n\nDespués`, "BlockMath")).toEqual([block]);
  });

  it("keeps an unterminated block from leaking into inline math", () => {
    expect(nodes("$$\nx = 1", "BlockMath")).toEqual(["$$\nx = 1"]);
  });
});

describe("footnotes", () => {
  it("recognises references and definition labels", () => {
    expect(nodes("Texto[^1] y más.\n\n[^1]: La nota.", "FootnoteRef")).toEqual([
      "[^1]",
      "[^1]",
    ]);
  });

  it("does not confuse a normal link with a footnote", () => {
    expect(nodes("[enlace](https://a.b)", "FootnoteRef")).toEqual([]);
  });
});
