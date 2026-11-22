// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { renderPreviewHtml } from "./render-preview";

async function html(markdown: string): Promise<string> {
  const result = await renderPreviewHtml(
    { markdown, settings: DEFAULT_SETTINGS },
    "pandoc",
  );
  if (!result.ok) throw new Error(`Preview failed: ${result.error.message}`);
  return result.html;
}

describe("preview HTML", () => {
  it("renders headings with prefixed, readable ids", async () => {
    // The default template numbers sections: the number comes first, in its own span.
    const output = await html("# Introducción");
    expect(output).toContain('id="pv-introduccion"');
    expect(output).toContain(
      '<span class="header-section-number">1</span> Introducción</h1>',
    );
  });

  it("leaves formulas as TeX for the client to typeset", async () => {
    const output = await html("Sea $a < b$.\n\n$$\nx^2\n$$");
    expect(output).toContain('<span class="math inline">a &lt; b</span>');
    expect(output).toContain('<span class="math display">');
  });

  it("renders tables, figures, task lists and footnotes", async () => {
    const output = await html(
      "| a | b |\n|:--|--:|\n| 1 | 2 |\n\n![Pie](d.png)\n\n- [x] hecha\n\nNota[^1].\n\n[^1]: Texto.",
    );
    expect(output).toContain("<table>");
    expect(output).toContain('style="text-align: right;"');
    expect(output).toContain('<img src="d.png"');
    expect(output).toContain("<figcaption");
    expect(output).toContain('type="checkbox"');
    expect(output).toContain('href="#pv-fn1"');
  });

  it("puts the YAML title, authors and date in a title block", async () => {
    const output = await html(
      "---\ntitle: Mi tesis\nauthor: [Ada, Alan]\ndate: 2026\n---\n\nx",
    );
    expect(output).toContain('<h1 class="title">Mi tesis</h1>');
    expect(output.match(/class="author"/g)).toHaveLength(2);
    expect(output).toContain('<p class="date">2026</p>');
  });

  it("has no title block when the document has no title", async () => {
    expect(await html("Solo texto.")).not.toContain("title-block");
  });

  it("removes raw HTML, scripts included", async () => {
    const output = await html(
      'Antes <span onclick="x()">dentro</span> <!-- nota -->\n\n<script>alert(1)</script>\n\n<div onmouseover="y()">\n\nbloque\n\n</div>',
    );
    expect(output).not.toContain("<script");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("onmouseover");
    expect(output).not.toContain("<!--");
    expect(output).toContain("dentro");
    expect(output).toContain("bloque");
  });

  it("removes raw TeX, which has no meaning in HTML", async () => {
    expect(await html("Texto \\newpage más.")).not.toContain("newpage");
  });

  it("reports no warnings for an ordinary document, with or without a title", async () => {
    for (const markdown of ["---\ntitle: T\n---\n\nx", "# Sin metadatos\n\nx"]) {
      const result = await renderPreviewHtml(
        { markdown, settings: DEFAULT_SETTINGS },
        "pandoc",
      );
      expect(result).toMatchObject({ ok: true, warnings: [] });
    }
  });

  it("numbers sections, adds a table of contents and an abstract, in the document's language", async () => {
    const markdown = "---\ntitle: T\nabstract: Breve.\n---\n\n# Uno\n\n## Dos";
    const result = await renderPreviewHtml(
      {
        markdown,
        settings: { ...DEFAULT_SETTINGS, numberSections: true, tableOfContents: true },
      },
      "pandoc",
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.html).toContain('<span class="header-section-number">1.1</span>');
    expect(result.html).toContain('<nav class="toc" role="doc-toc">');
    expect(result.html).toContain('<h2 class="toc-title">Índice</h2>');
    expect(result.html).toContain('<p class="abstract-title">Resumen</p>');

    const english = await renderPreviewHtml(
      {
        markdown,
        settings: { ...DEFAULT_SETTINGS, tableOfContents: true, language: "en" },
      },
      "pandoc",
    );
    expect(english.ok && english.html).toContain('<h2 class="toc-title">Contents</h2>');
  });

  it("formats citations and lists the references, with prefixed ids", async () => {
    const result = await renderPreviewHtml(
      {
        markdown: "Según [@perez2020].",
        settings: DEFAULT_SETTINGS,
        bibliography: String.raw`@book{perez2020, author = {P{\'e}rez, Ana}, title = {Series}, year = {2020}}`,
      },
      "pandoc",
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.html).toContain('href="#pv-ref-perez2020"');
    expect(result.html).toContain('id="pv-ref-perez2020"');
    expect(result.html).toContain(">Referencias</h1>");
    expect(result.warnings).toEqual([]);
  });

  it("reports a YAML error like the LaTeX conversion does", async () => {
    const result = await renderPreviewHtml(
      { markdown: "---\ntitle: [a\n---\n", settings: DEFAULT_SETTINGS },
      "pandoc",
    );
    expect(result).toMatchObject({ ok: false, error: { code: "syntax", line: 2 } });
  });
});
