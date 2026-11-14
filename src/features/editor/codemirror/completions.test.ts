import { CompletionContext, type Completion } from "@codemirror/autocomplete";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { citationCompletions, slashCompletions, texCompletions } from "./completions";
import { markdownSupport } from "./language";

/** Runs a completion source with the cursor at the `|` in `marked`. */
function complete(
  source: (context: CompletionContext) => ReturnType<typeof slashCompletions>,
  marked: string,
) {
  const pos = marked.indexOf("|");
  const doc = marked.replace("|", "");
  const state = EditorState.create({ doc, extensions: [markdownSupport()] });
  ensureSyntaxTree(state, doc.length, 5000);
  const result = source(new CompletionContext(state, pos, false));
  return { state, result, labels: result?.options.map((option) => option.label) ?? [] };
}

/** Applies a completion the way the editor would and returns the new document. */
function apply(marked: string, source: typeof slashCompletions, label: string): string {
  const { state, result } = complete(source, marked);
  const option = result?.options.find((candidate) => candidate.label === label);
  if (!result || !option || typeof option.apply !== "function") {
    throw new Error(`No snippet completion "${label}".`);
  }
  let next = state;
  const view = { state, dispatch: (tr: { state: EditorState }) => (next = tr.state) };
  type Apply = (view: unknown, option: Completion, from: number, to: number) => void;
  (option.apply as Apply)(view, option, result.from, marked.indexOf("|"));
  return next.doc.toString();
}

describe("slash completions", () => {
  it("opens at the start of a line and after a space", () => {
    expect(complete(slashCompletions, "/ta|").labels).toContain("/tabla");
    expect(complete(slashCompletions, "texto /|").labels).toContain("/imagen");
  });

  it("stays out of the way inside words, URLs, code and math", () => {
    expect(complete(slashCompletions, "y/o|").result).toBeNull();
    expect(complete(slashCompletions, "https://|").result).toBeNull();
    expect(complete(slashCompletions, "```\n/ta|\n```").result).toBeNull();
    expect(complete(slashCompletions, "$a /b|$").result).toBeNull();
  });

  it("replaces the typed command with the template", () => {
    expect(apply("/h2|", slashCompletions, "/h2")).toBe("## Sección");
  });
});

describe("TeX completions", () => {
  it("offers commands after a backslash and a letter", () => {
    expect(complete(texCompletions, "$\\fr|$").labels).toContain("\\frac");
    expect(complete(texCompletions, "$\\|$").result).toBeNull();
  });

  it("is not offered inside code", () => {
    expect(complete(texCompletions, "`\\al|`").result).toBeNull();
  });

  it("expands a command with arguments, keeping its braces", () => {
    expect(apply("$\\fr|$", texCompletions, "\\frac")).toBe(
      "$\\frac{numerador}{denominador}$",
    );
    expect(apply("$\\be|$", texCompletions, "\\begin")).toContain("\\end{entorno}");
  });
});

it("inserts a citation with the cursor after the @", () => {
  expect(apply("Según /cit|", slashCompletions, "/citar")).toBe("Según [@]");
});

describe("citation completions", () => {
  const citations = citationCompletions(() => [
    { key: "perez2020", label: "Pérez y Gómez (2020)", title: "Series convergentes" },
    { key: "knuth1984", label: "Knuth (1984)", title: "The TeXbook" },
  ]);

  it("offers the document's references after @, with their authors and year", () => {
    const { result, labels } = complete(citations, "Según [@pe|");
    expect(labels).toEqual(["@perez2020", "@knuth1984"]);
    expect(result?.options[0]).toMatchObject({ detail: "Pérez y Gómez (2020)" });
    expect(complete(citations, "como dice -@|").labels).toContain("@knuth1984");
  });

  it("stays out of e-mail addresses, code and math", () => {
    expect(complete(citations, "ana@ex|").result).toBeNull();
    expect(complete(citations, "`@pe|`").result).toBeNull();
    expect(complete(citations, "$a @b|$").result).toBeNull();
  });

  it("offers nothing when the document has no references", () => {
    expect(
      complete(
        citationCompletions(() => []),
        "[@|",
      ).result,
    ).toBeNull();
  });
});
