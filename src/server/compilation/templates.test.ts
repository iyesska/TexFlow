// @vitest-environment node
import { existsSync } from "node:fs";

import { getDocument, OPS, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import { findIsolation } from "@/server/sandbox/isolation";
import { TEMPLATES, templateSettings } from "@/templates/catalog";
import { PAPER_SIZES, type DocumentSettings, type FontId } from "@/templates/settings";

import { compileDocument } from "./compile-document";

/**
 * Compiles every template, offline, and reads the resulting PDF back: these tests are
 * what tells the LaTeX package cache (scripts/setup-tectonic.sh) is complete.
 */

const toolchain = {
  pandocPath: "pandoc",
  tectonicPath: "tectonic",
  cacheDir: process.env.TECTONIC_CACHE_DIR ?? "/var/cache/texflow/tectonic",
};

const ready =
  existsSync("/usr/local/bin/tectonic") &&
  existsSync(toolchain.cacheDir) &&
  (await findIsolation()) !== null;

const DOCUMENT = [
  "---",
  "title: Informe de prueba",
  "author: Autoría de prueba",
  "date: 2026",
  "abstract: Un resumen breve.",
  "---",
  "",
  "# Introducción",
  "",
  "Texto con $e^{i\\pi} + 1 = 0$ y una nota[^1].",
  "",
  "| a | b |",
  "|---|---|",
  "| 1 | 2 |",
  "",
  ": Datos",
  "",
  "## Contexto",
  "",
  "\\newpage",
  "",
  "Segunda página.",
  "",
  "# Métodos",
  "",
  "Fin, con `código en línea` y un bloque:",
  "",
  "```python",
  "def fibonacci(n: int) -> int:  # Una línea larga que LaTeX tiene que partir en dos.",
  "    return n if n < 2 else fibonacci(n - 1) + fibonacci(n - 2)",
  "```",
  "",
  "[^1]: La nota.",
].join("\n");

/** Font family names as LaTeX embeds them. */
const EMBEDDED_FONT: Readonly<Record<FontId, string>> = {
  libertinus: "LibertinusSerif",
  "latin-modern": "LMRoman",
  pagella: "TeXGyrePagella",
  termes: "TeXGyreTermes",
  heros: "TeXGyreHeros",
};

const POINTS_PER_MM = 72 / 25.4;

interface ReadPdf {
  readonly pages: string[];
  readonly width: number;
  readonly height: number;
  readonly fonts: Set<string>;
}

async function readPdf(data: Uint8Array): Promise<ReadPdf> {
  // fontExtraProperties keeps the fonts' names, which rendering alone does not need.
  const task = getDocument({ data, verbosity: 0, fontExtraProperties: true });
  const pdf: PDFDocumentProxy = await task.promise;
  const pages: string[] = [];
  const fonts = new Set<string>();
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    // pdf.js splits a line into runs; collapse the spacing between them.
    pages.push(text.replace(/\s+/g, " "));
    const operators = await page.getOperatorList();
    operators.fnArray.forEach((operation, index) => {
      if (operation !== OPS.setFont) return;
      const [id] = operators.argsArray[index] as [string];
      const font = page.commonObjs.get(id) as { name?: string };
      // Embedded subsets are named "ABCDEF+FamilyName-Style".
      if (font.name) fonts.add(font.name.replace(/^[A-Z]{6}\+/, ""));
    });
  }
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = (await pdf.getPage(1)).view;
  await task.destroy();
  return { pages, width: x1 - x0, height: y1 - y0, fonts };
}

async function compile(settings: DocumentSettings): Promise<ReadPdf> {
  const result = await compileDocument(DOCUMENT, [], settings, toolchain);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  // Every template must compile without a single LaTeX warning.
  expect(result.warnings.map(({ message }) => message)).toEqual([]);
  return readPdf(new Uint8Array(result.pdf));
}

describe.skipIf(!ready)("every template", () => {
  it.each(TEMPLATES.map((template) => [template.name, template.id] as const))(
    "%s compiles offline with its paper, font and language",
    async (_name, id) => {
      const settings = templateSettings(id);
      const pdf = await compile(settings);
      const paper = PAPER_SIZES[settings.paperSize];
      expect(pdf.width).toBeCloseTo(paper.width * POINTS_PER_MM, 0);
      expect(pdf.height).toBeCloseTo(paper.height * POINTS_PER_MM, 0);
      expect(
        [...pdf.fonts].some((font) => font.includes(EMBEDDED_FONT[settings.font])),
      ).toBe(true);

      const text = pdf.pages.join("\n");
      expect(text).toContain("Informe de prueba");
      expect(text).toContain("Tabla");
      expect(text).toContain("Resumen");
      if (settings.tableOfContents) expect(text).toContain("Índice");
    },
    60_000,
  );
});

describe.skipIf(!ready)("design settings in the PDF", () => {
  const base = templateSettings("academic-paper");

  it("sets the paper size and the cover page", async () => {
    const pdf = await compile({ ...base, paperSize: "a5", cover: "page" });
    expect(pdf.width).toBeCloseTo(148 * POINTS_PER_MM, 0);
    // The cover holds the title and nothing of the body.
    expect(pdf.pages[0]).toContain("Informe de prueba");
    expect(pdf.pages[0]).not.toContain("Introducción");
  }, 60_000);

  it("runs the title and the section along the top, and counts pages at the foot", async () => {
    const pdf = await compile({
      ...base,
      header: "title-section",
      footer: "page-of-total",
    });
    const last = pdf.pages.length;
    expect(pdf.pages[1]).toContain("Informe de prueba");
    // The running head names the section in effect on the page: here, the one it opens.
    expect(pdf.pages[1]).toContain("2 Métodos");
    expect(pdf.pages[1]).toContain(`2 de ${last}`);
  }, 60_000);

  it("writes in English when the document is in English", async () => {
    const pdf = await compile({ ...base, language: "en", footer: "page-of-total" });
    const text = pdf.pages.join("\n");
    expect(text).toContain("Table");
    expect(text).toContain("Abstract");
    expect(text).toContain(`1 of ${pdf.pages.length}`);
  }, 60_000);

  it("leaves sections unnumbered when asked", async () => {
    const pdf = await compile({ ...base, numberSections: false });
    expect(pdf.pages.join("\n")).not.toMatch(/\b1 Introducción/);
  }, 60_000);

  it("opens a thesis with roman-numbered front matter and numbered chapters", async () => {
    const pdf = await compile(templateSettings("thesis"));
    const text = pdf.pages.join("\n");
    expect(text).toContain("Capítulo 1");
    expect(pdf.pages.some((page) => /\bi\b/.test(page) && page.includes("Resumen"))).toBe(
      true,
    );
  }, 60_000);
});
