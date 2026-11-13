// @vitest-environment node
import { describe, expect, it } from "vitest";

import { LIMITS } from "@/config/limits";

import { withPreambleNotes } from "./body-requirements";
import { convertMarkdownToLatex } from "./convert-markdown";

/** Converts a body-only fragment and returns the LaTeX, failing the test on error. */
async function body(markdown: string): Promise<string> {
  const result = await convertMarkdownToLatex({ markdown, standalone: false }, "pandoc");
  if (!result.ok) throw new Error(`Conversion failed: ${result.error.message}`);
  return result.latex;
}

describe("Markdown to LaTeX", () => {
  it("converts headings to sectioning commands", async () => {
    const latex = await body("# Uno\n\n## Dos\n\n### Tres");
    expect(latex).toContain("\\section{Uno}");
    expect(latex).toContain("\\subsection{Dos}");
    expect(latex).toContain("\\subsubsection{Tres}");
  });

  it("labels sections with readable ASCII identifiers", async () => {
    expect(await body("# Introducción a TexFlow")).toContain(
      "\\label{introduccion-a-texflow}",
    );
  });

  it("converts bold, italic and inline code", async () => {
    const latex = await body("**fuerte**, _énfasis_ y `código`");
    expect(latex).toContain("\\textbf{fuerte}");
    expect(latex).toContain("\\emph{énfasis}");
    expect(latex).toContain("\\texttt{código}");
  });

  it("converts unordered and ordered lists", async () => {
    const latex = await body("- a\n- b\n\n1. uno\n2. dos");
    expect(latex).toContain("\\begin{itemize}");
    expect(latex).toContain("\\begin{enumerate}");
    // Pandoc puts each \\item on its own line; the notes mention \\itemsep.
    expect(latex.match(/^\\item$/gm)).toHaveLength(4);
  });

  it("converts links and images", async () => {
    const latex = await body("[Pandoc](https://pandoc.org)\n\n![Un diagrama](fig/d.png)");
    expect(latex).toContain("\\href{https://pandoc.org}{Pandoc}");
    expect(latex).toContain("\\includegraphics{fig/d.png}");
    expect(latex).toContain("\\caption{Un diagrama}");
  });

  it("converts tables, keeping column alignment", async () => {
    const latex = await body("| a | b |\n|:--|--:|\n| 1 | 2 |");
    expect(latex).toContain("\\begin{longtable}[]{@{}lr@{}}");
    expect(latex).toContain("1 & 2 \\\\");
  });

  it("converts blockquotes and code blocks", async () => {
    const latex = await body("> cita\n\n```python\nprint(1)\n```");
    expect(latex).toContain("\\begin{quote}");
    expect(latex).toContain("\\begin{verbatim}\nprint(1)\n\\end{verbatim}");
  });

  it("passes math through untouched, inline and display", async () => {
    const latex = await body("Sea $e^{i\\pi}$.\n\n$$\n\\int_0^1 x\\,dx\n$$");
    expect(latex).toContain("\\(e^{i\\pi}\\)");
    expect(latex).toContain("\\[\n\\int_0^1 x\\,dx\n\\]");
  });

  it("does not read a price as math", async () => {
    expect(await body("Cuesta $5 y luego $10.")).toContain("\\$5 y luego \\$10");
  });

  it("converts footnotes", async () => {
    const latex = await body("Texto[^n].\n\n[^n]: La nota.");
    expect(latex).toContain("Texto\\footnote{La nota.}");
  });

  it("escapes LaTeX special characters in prose", async () => {
    const latex = await body("100% de A & B_c #1 {x}");
    expect(latex).toContain("100\\% de A \\& B\\_c \\#1 \\{x\\}");
  });

  it("produces an empty body for an empty document", async () => {
    expect((await body("")).trim()).toBe("");
  });
});

describe("standalone documents", () => {
  it("wraps the body in a complete document with the YAML metadata", async () => {
    const markdown =
      "---\ntitle: Mi tesis\nauthor: Ada\n---\n\n# Intro\n\n```c\nint x;\n```";
    const result = await convertMarkdownToLatex({ markdown, standalone: true }, "pandoc");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toMatch(/\\documentclass\[\s*a4paper/);
    expect(result.latex).toContain("\\title{Mi tesis}");
    expect(result.latex).toContain("\\author{Ada}");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\usepackage{listings}");
    expect(result.latex).toContain("\\begin{lstlisting}[language=C]");
    expect(result.latex.trimEnd().endsWith("\\end{document}")).toBe(true);
  });
});

describe("body-only fragments", () => {
  it("lists the preamble lines the fragment needs", async () => {
    const latex = await body("| a |\n|---|\n| 1 |\n\n- x\n\n[l](https://a.b)");
    const notes = latex.slice(0, latex.indexOf("\n\n"));
    expect(notes).toContain("% Este fragmento necesita");
    expect(notes).toContain("\\usepackage{longtable,booktabs,array}");
    expect(notes).toContain("\\usepackage{hyperref}");
    expect(notes).toContain("\\providecommand{\\tightlist}");
  });

  it("adds no notes when plain text needs nothing, and lists each line once", () => {
    expect(withPreambleNotes("Hola.")).toBe("Hola.");
    const notes = withPreambleNotes("\\href{a}{b} \\hypertarget{c}{d}");
    expect(notes.match(/usepackage\{hyperref\}/g)).toHaveLength(1);
  });
});

describe("failures", () => {
  it("reports a YAML error with its line", async () => {
    const result = await convertMarkdownToLatex(
      { markdown: "---\ntitle: [a\n---\n\ntexto", standalone: true },
      "pandoc",
    );
    expect(result).toMatchObject({ ok: false, error: { code: "syntax", line: 2 } });
  });

  it("rejects a document over the size limit without running Pandoc", async () => {
    const markdown = "a".repeat(LIMITS.maxMarkdownLength + 1);
    const result = await convertMarkdownToLatex({ markdown, standalone: true }, "pandoc");
    expect(result).toMatchObject({ ok: false, error: { code: "too-large" } });
  });

  it("reports a missing Pandoc as unavailable", async () => {
    const result = await convertMarkdownToLatex(
      { markdown: "x", standalone: true },
      "/no/such/pandoc",
    );
    expect(result).toMatchObject({ ok: false, error: { code: "unavailable" } });
  });
});

describe("isolation", () => {
  it("does not let the document read files from the server", async () => {
    // Pandoc can include files through raw attributes and `include` directives of some
    // readers; with --sandbox none of them may touch the file system.
    const markdown = [
      "```{.include}\n/etc/passwd\n```",
      "![](/etc/passwd)",
      "::: {.include file=/etc/passwd}\n:::",
    ].join("\n\n");
    const latex = await body(markdown);
    expect(latex).not.toContain("root:");
  });

  it("treats option-like text in the document as text", async () => {
    const latex = await body("--lua-filter=/tmp/x.lua --output=/tmp/pwned");
    expect(latex).toContain("lua-filter");
  });
});
