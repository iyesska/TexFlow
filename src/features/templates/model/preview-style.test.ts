import { describe, expect, it } from "vitest";

import { templateSettings } from "@/templates/catalog";

import { documentAttributes, pageWidthPx, previewStyle } from "./preview-style";

const style = (settings: Parameters<typeof previewStyle>[0]) =>
  previewStyle(settings) as Record<string, string>;

describe("previewStyle", () => {
  const academic = templateSettings("academic-paper");

  it("lays out the page in millimetres", () => {
    const css = style({
      ...academic,
      paperSize: "a5",
      margins: { top: 20, bottom: 21, left: 22, right: 23 },
    });
    expect(css).toMatchObject({
      "--page-width": "148mm",
      "--page-height": "210mm",
      "--page-margin-top": "20mm",
      "--page-margin-bottom": "21mm",
      "--page-margin-left": "22mm",
      "--page-margin-right": "23mm",
    });
  });

  it("uses LaTeX's real sizes: 11 pt is 10.95 pt, on a 13.6 pt baseline", () => {
    const css = style({ ...academic, fontSize: 11, lineSpacing: 1 });
    expect(css["--page-font-size"]).toBe("10.95pt");
    expect(Number(css["--page-line-height"])).toBeCloseTo(13.6 / 10.95, 2);
    expect(css["--tex-Large"]).toBe("14.4pt");
  });

  it("multiplies the baseline by the line spacing", () => {
    const single = Number(style({ ...academic, lineSpacing: 1 })["--page-line-height"]);
    const double = Number(style({ ...academic, lineSpacing: 2 })["--page-line-height"]);
    expect(double).toBeCloseTo(single * 2, 2);
  });

  it("sets the template's face first in the stack", () => {
    expect(style({ ...academic, font: "pagella" })["--page-font-family"]).toMatch(
      /^var\(--font-tf-pagella\)/,
    );
  });

  it("writes caption words in the document's language", () => {
    expect(style({ ...academic, language: "es" })["--table-label"]).toBe('"Tabla"');
    expect(style({ ...academic, language: "en" })["--chapter-label"]).toBe('"Chapter"');
  });
});

describe("documentAttributes", () => {
  it("names the language and the structure", () => {
    expect(documentAttributes(templateSettings("thesis", "en"))).toEqual({
      lang: "en",
      "data-structure": "book",
    });
  });
});

describe("pageWidthPx", () => {
  it("converts the paper width to CSS pixels", () => {
    expect(pageWidthPx(templateSettings("academic-paper"))).toBeCloseTo(793.7, 0);
  });
});
