// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseDiagnostics } from "./diagnostics";
import { locateInMarkdown } from "./locate-in-markdown";

const latex = (body: string) =>
  `\\documentclass{article}\n\\begin{document}\n${body}\n\\end{document}`;

describe("parseDiagnostics", () => {
  it("names the unknown command and traces it to the Markdown line", () => {
    const markdown = "# Título\n\nTexto con \\foo{x} raro.";
    const source = latex("Texto con \\foo{x} raro.");
    const [error] = parseDiagnostics(
      "error: main.tex:3: Undefined control sequence\nerror: halted on potentially-recoverable error as specified",
      "! Undefined control sequence.\nl.3 Texto con \\foo\n                   {x} raro.",
      source,
      markdown,
    );
    expect(error).toEqual({
      severity: "error",
      message: "LaTeX no conoce el comando \\foo. Revisa cómo está escrito.",
      detail: "Undefined control sequence",
      latexLine: 3,
      markdownLine: 3,
      excerpt: "Texto con \\foo{x} raro.",
    });
  });

  it("explains a missing image and a missing package", () => {
    const diagnostics = parseDiagnostics(
      "error: main.tex:3: Unable to load picture or PDF file 'falta.png'\nerror: main.tex:1: ! LaTeX Error: File `tikz.sty' not found.",
      "",
      latex("\\includegraphics{falta.png}"),
      "![x](falta.png)",
    );
    expect(diagnostics[0]).toMatchObject({
      message:
        "No se encontró la imagen «falta.png». Añádela al documento desde el editor.",
      markdownLine: 1,
    });
    expect(diagnostics[1]?.message).toBe(
      "El paquete LaTeX «tikz» no está disponible en este servidor.",
    );
    expect(diagnostics[1]?.detail).toBe("File `tikz.sty' not found");
  });

  it("explains errors that carry no line", () => {
    const [error] = parseDiagnostics(
      "error: !File ended while scanning use of \\frac ",
      "",
      latex("x"),
      "$$\n\\frac{a}{\n$$",
    );
    expect(error).toMatchObject({
      severity: "error",
      message: "A \\frac le falta una llave de cierre «}».",
      markdownLine: 2,
    });
    expect(error?.latexLine).toBeUndefined();
  });

  it("does not blame a server file the document tried to read", () => {
    const [error] = parseDiagnostics(
      "error: main.tex:3: ! LaTeX Error: File `/etc/passwd.tex' not found.",
      "",
      latex("\\input{/etc/passwd}"),
      "\\input{/etc/passwd}",
    );
    expect(error?.message).toContain("solo puede usar sus propias imágenes");
  });

  it("falls back to a generic explanation, keeping the engine's words", () => {
    const [error] = parseDiagnostics(
      "error: main.tex:3: Something unheard of",
      "",
      latex("x"),
      "x",
    );
    expect(error).toMatchObject({
      message: "LaTeX no pudo componer el documento.",
      detail: "Something unheard of",
    });
  });

  it("reports each warning once, explained, and drops the noise", () => {
    const overfull =
      "warning: main.tex:3: Overfull \\hbox (27.00378pt too wide) in paragraph at lines 3--3";
    const diagnostics = parseDiagnostics(
      [
        overfull,
        overfull,
        "warning: main.tex:3: Underfull \\hbox (badness 10000) in paragraph",
        "warning: warnings were issued by the TeX engine; use --print and/or --keep-logs for details.",
        "Fontconfig error: Cannot load default config file",
      ].join("\n"),
      "",
      latex("x"),
      "x",
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        message: "Una línea sobresale 27 pt del margen derecho.",
        latexLine: 3,
      }),
    ]);
  });

  it("caps the number of warnings", () => {
    const stderr = Array.from(
      { length: 60 },
      (_, index) => `warning: main.tex:${index + 1}: W${index}`,
    );
    expect(parseDiagnostics(stderr.join("\n"), "", "", "")).toHaveLength(20);
  });
});

describe("locateInMarkdown", () => {
  const markdown =
    "# Título\n\nPrimer párrafo con \\alpha aquí.\n\nSegundo párrafo con \\alpha y más palabras distintas.";

  it("returns the only line that contains the token", () => {
    expect(locateInMarkdown("uno\ndos \\foo\ntres", "\\foo", undefined)).toBe(2);
  });

  it("chooses among several by the words they share with the LaTeX line", () => {
    expect(
      locateInMarkdown(
        markdown,
        "\\alpha",
        "Segundo párrafo con \\(\\alpha\\) y más palabras distintas.",
      ),
    ).toBe(5);
  });

  it("matches by words alone when there is no token", () => {
    expect(
      locateInMarkdown(markdown, undefined, "Primer párrafo con \\(\\alpha\\) aquí."),
    ).toBe(3);
  });

  it("gives no line rather than a doubtful one", () => {
    expect(locateInMarkdown(markdown, "\\alpha", undefined)).toBeUndefined();
    expect(locateInMarkdown(markdown, "\\beta", "x")).toBeUndefined();
    expect(locateInMarkdown("a b c\na b c", undefined, "aaa bbb ccc")).toBeUndefined();
    expect(locateInMarkdown(markdown, undefined, "\\makeatletter")).toBeUndefined();
  });
});
