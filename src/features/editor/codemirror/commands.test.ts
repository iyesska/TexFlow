import { EditorSelection, EditorState, type StateCommand } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  BLOCK_TEMPLATES,
  insertBlock,
  insertLink,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleItalic,
  toggleOrderedList,
} from "./commands";

/**
 * Runs a command on a document where `[` and `]` mark the selection (or `|` a cursor)
 * and returns the result in the same notation.
 */
function run(command: StateCommand, marked: string): string {
  const cursor = marked.indexOf("|");
  const from = cursor !== -1 ? cursor : marked.indexOf("[");
  const to = cursor !== -1 ? cursor : marked.indexOf("]") - 1;
  const doc = marked.replace(/[|[\]]/g, "");
  let state = EditorState.create({ doc, selection: EditorSelection.range(from, to) });
  command({ state, dispatch: (transaction) => (state = transaction.state) });
  const { from: start, to: end } = state.selection.main;
  const text = state.doc.toString();
  return start === end
    ? `${text.slice(0, start)}|${text.slice(start)}`
    : `${text.slice(0, start)}[${text.slice(start, end)}]${text.slice(end)}`;
}

describe("inline formatting", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(run(toggleBold, "una [palabra] aquí")).toBe("una **[palabra]** aquí");
  });

  it("unwraps when the markers surround the selection", () => {
    expect(run(toggleBold, "una **[palabra]** aquí")).toBe("una [palabra] aquí");
  });

  it("unwraps when the markers are part of the selection", () => {
    expect(run(toggleBold, "una [**palabra**] aquí")).toBe("una [palabra] aquí");
  });

  it("inserts a placeholder at an empty cursor", () => {
    expect(run(toggleItalic, "hola |")).toBe("hola _[texto en cursiva]_");
  });

  it("italicises text that is already bold without breaking the bold", () => {
    expect(run(toggleItalic, "**[fuerte]**")).toBe("**_[fuerte]_**");
  });
});

describe("headings", () => {
  it("sets, changes and removes a heading", () => {
    expect(run(toggleHeading(2), "Títu|lo")).toBe("## Títu|lo");
    expect(run(toggleHeading(1), "## Títu|lo")).toBe("# Títu|lo");
    expect(run(toggleHeading(1), "# Títu|lo")).toBe("Títu|lo");
  });
});

describe("line prefixes", () => {
  it("turns every selected line into a bullet and back", () => {
    expect(run(toggleBulletList, "[uno\ndos]")).toBe("- [uno\n- dos]");
    expect(run(toggleBulletList, "[- uno\n- dos]")).toBe("[uno\ndos]");
  });

  it("numbers lines in order and replaces an existing bullet", () => {
    expect(run(toggleOrderedList, "[- uno\n- dos\n- tres]")).toBe(
      "[1. uno\n2. dos\n3. tres]",
    );
  });

  it("keeps the indentation of nested items", () => {
    expect(run(toggleOrderedList, "  - anid|ado")).toBe("  1. anid|ado");
  });

  it("skips blank lines between paragraphs but accepts a lone blank line", () => {
    expect(run(toggleBulletList, "[uno\n\ndos]")).toBe("- [uno\n\n- dos]");
    expect(run(toggleBulletList, "|")).toBe("- |");
  });

  it("quotes and unquotes", () => {
    expect(run(toggleBlockquote, "cit|a")).toBe("> cit|a");
    expect(run(toggleBlockquote, "> cit|a")).toBe("cit|a");
  });
});

describe("insertions", () => {
  it("links the selection and puts the cursor on the URL", () => {
    expect(run(insertLink, "ver [Pandoc] ya")).toBe("ver [Pandoc]([https://]) ya");
  });

  it("inserts a block on a blank line and selects its first field", () => {
    expect(run(insertBlock(BLOCK_TEMPLATES.mathBlock), "|")).toBe("$$\n[fórmula]\n$$");
  });

  it("starts a new paragraph when the cursor is on a line with text", () => {
    expect(run(insertBlock(BLOCK_TEMPLATES.image), "Text|o")).toBe(
      "Texto\n\n![[Descripción de la imagen]](ruta/imagen.png)",
    );
  });

  it("builds a table with literal pipes and dashes", () => {
    const result = run(insertBlock(BLOCK_TEMPLATES.table), "|");
    expect(result.replace(/[[\]]/g, "")).toBe(
      "| Columna 1 | Columna 2 |\n| --- | --- |\n| Celda | Celda |\n| Celda | Celda |",
    );
  });
});
