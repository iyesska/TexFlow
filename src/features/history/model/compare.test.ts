import { describe, expect, it } from "vitest";

import { compareTexts, type Comparison, type DiffLine } from "./compare";

function compared(before: string, after: string) {
  const comparison: Comparison = compareTexts(before, after);
  if (!comparison.ok) throw new Error("The comparison gave up.");
  return comparison;
}

/** Each line as "+ text", "- text" or "  text", with changed words in [brackets]. */
function render(line: DiffLine): string {
  const sign = { same: " ", removed: "-", added: "+" }[line.kind];
  const text = line.segments
    .map((segment) => (segment.changed ? `[${segment.text}]` : segment.text))
    .join("");
  return `${sign} ${text}`;
}

const numbered = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => `Línea ${index + from}`);

describe("compareTexts", () => {
  it("finds nothing to show between equal texts", () => {
    expect(compared("# Título\n\nTexto.", "# Título\n\nTexto.")).toEqual({
      ok: true,
      blocks: [],
      added: 0,
      removed: 0,
    });
  });

  it("does not count a final newline as a change", () => {
    expect(compared("Texto.\n", "Texto.").blocks).toEqual([]);
  });

  it("marks the words that changed inside a paragraph", () => {
    const comparison = compared(
      "Las series convergen deprisa.\n",
      "Las series convergen despacio.\n",
    );
    expect(comparison).toMatchObject({ added: 1, removed: 1 });
    expect(comparison.blocks).toHaveLength(1);
    expect(comparison.blocks[0]?.lines.map(render)).toEqual([
      "- Las series convergen [deprisa].",
      "+ Las series convergen [despacio].",
    ]);
  });

  it("shows a line rewritten from scratch as replaced whole", () => {
    const lines = compared("Uno dos tres.", "Algo distinto por completo.").blocks[0]
      ?.lines;
    expect(lines?.map(render)).toEqual([
      "- Uno dos tres.",
      "+ Algo distinto por completo.",
    ]);
  });

  it("numbers the lines of both texts", () => {
    const lines = compared("a\nb\nc", "a\nB\nc\nd").blocks[0]?.lines ?? [];
    expect(lines.map(({ kind, before, after }) => [kind, before, after])).toEqual([
      ["same", 1, 1],
      ["removed", 2, null],
      ["added", null, 2],
      ["same", 3, 3],
      ["added", null, 4],
    ]);
  });

  it("folds unchanged lines away from the changes, keeping three around each", () => {
    const before = numbered(20).join("\n");
    const after = before.replace("Línea 10", "Línea diez");
    const { blocks } = compared(before, after);
    expect(blocks.map((block) => [block.kind, block.lines.length])).toEqual([
      ["folded", 6],
      ["lines", 8],
      ["folded", 7],
    ]);
    expect(blocks[1]?.lines[0]).toMatchObject({ before: 7, after: 7 });
  });

  it("shows a short run of unchanged lines between two changes", () => {
    const before = numbered(16).join("\n");
    const after = before
      .replace("Línea 2\n", "Línea dos\n")
      .replace("Línea 12", "Línea doce");
    const { blocks } = compared(before, after);
    // Lines 6 to 8 are more than three lines from either change, but folding three
    // lines would save less room than the fold itself takes.
    expect(blocks.map((block) => block.kind)).toEqual(["lines"]);
    expect(blocks[0]?.lines).toHaveLength(18);
  });

  it("counts lines added at the end and removed at the start", () => {
    const comparison = compared(
      "Primera\nSegunda\nTercera",
      "Segunda\nTercera\nCuarta\nQuinta",
    );
    expect(comparison).toMatchObject({ added: 2, removed: 1 });
    expect(comparison.blocks[0]?.lines.map(render)).toEqual([
      "- Primera",
      "  Segunda",
      "  Tercera",
      "+ Cuarta",
      "+ Quinta",
    ]);
  });

  it("compares an empty document with a written one", () => {
    const comparison = compared("", "# Título\n\nTexto.");
    expect(comparison).toMatchObject({ added: 3, removed: 0 });
  });
});
