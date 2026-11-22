// @vitest-environment node
import { describe, expect, it } from "vitest";

import { TEMPLATES, templateSettings } from "@/templates/catalog";

import { latexLayout, PREAMBLE_FILE, previewLayoutOptions } from "./latex-layout";

const academic = templateSettings("academic-paper");

describe("latexLayout", () => {
  it("sets class, paper, size, margins, language and spacing", () => {
    const { options } = latexLayout({
      ...academic,
      paperSize: "a5",
      fontSize: 12,
      lineSpacing: 1.5,
      language: "en",
      margins: { top: 20, bottom: 21, left: 22, right: 23 },
    });
    expect(options).toEqual(
      expect.arrayContaining([
        "--variable=documentclass:article",
        "--variable=papersize:a5",
        "--variable=fontsize:12pt",
        "--variable=geometry:top=20mm",
        "--variable=geometry:bottom=21mm",
        "--variable=geometry:left=22mm",
        "--variable=geometry:right=23mm",
        "--variable=linestretch:1.5",
        "--variable=lang:en",
        `--include-in-header=${PREAMBLE_FILE}`,
      ]),
    );
  });

  it("leaves single spacing to LaTeX's default", () => {
    expect(
      latexLayout(academic).options.some((option) => option.includes("linestretch")),
    ).toBe(false);
  });

  it("numbers sections and adds a table of contents only when asked", () => {
    const plain = latexLayout({
      ...academic,
      numberSections: false,
      tableOfContents: false,
    });
    expect(plain.options).not.toContain("--number-sections");
    expect(plain.options).not.toContain("--toc");
    const full = latexLayout({
      ...academic,
      numberSections: true,
      tableOfContents: true,
    });
    expect(full.options).toEqual(expect.arrayContaining(["--number-sections", "--toc"]));
  });

  it("writes a thesis as a book in chapters, with front matter", () => {
    const { options, preamble } = latexLayout(templateSettings("thesis"));
    expect(options).toEqual(
      expect.arrayContaining([
        "--variable=documentclass:book",
        "--variable=classoption:oneside",
        "--top-level-division=chapter",
      ]),
    );
    expect(preamble).toContain("\\newenvironment{abstract}");
    expect(preamble).toContain("\\g@addto@macro\\mainmatter{\\markboth{}{}}");
    expect(preamble).toContain("\\renewcommand{\\chaptermark}");
    expect(preamble).toContain("\\pagenumbering{roman}");
  });

  it("selects the font for both XeLaTeX and pdfLaTeX", () => {
    const { preamble } = latexLayout({ ...academic, font: "pagella" });
    expect(preamble).toContain("\\usepackage{tgpagella}");
    expect(preamble).toContain("\\setmainfont{texgyrepagella}");
    expect(preamble).toContain("\\setmathfont{texgyrepagella-math.otf}");
    expect(latexLayout({ ...academic, font: "latin-modern" }).preamble).not.toContain(
      "setmainfont",
    );
  });

  it("builds headers and footers from the chosen styles", () => {
    const { preamble } = latexLayout({
      ...academic,
      header: "title-section",
      footer: "page-of-total",
    });
    expect(preamble).toContain("\\fancyhead[L]{\\small\\texflowtitle}");
    expect(preamble).toContain("\\fancyhead[R]{\\small\\nouppercase{\\leftmark}}");
    expect(preamble).toContain("\\usepackage{lastpage}");
    expect(preamble).toContain("\\fancyfoot[C]{\\thepage\\ de \\pageref*{LastPage}}");

    const bare = latexLayout({ ...academic, header: "none", footer: "none" }).preamble;
    expect(bare).not.toContain("\\fancyhead");
    expect(bare).not.toContain("\\fancyfoot");
    expect(bare).toContain("\\renewcommand{\\headrulewidth}{0pt}");
  });

  it("writes the footer in the document's language", () => {
    const { preamble } = latexLayout({
      ...academic,
      footer: "page-of-total",
      language: "en",
    });
    expect(preamble).toContain("\\thepage\\ of \\pageref*{LastPage}");
    expect(preamble).not.toContain("captionsspanish");
  });

  it("sets code in a monospaced face and breaks its long lines", () => {
    const { preamble } = latexLayout(academic);
    expect(preamble).toContain("basicstyle=\\ttfamily\\small");
    expect(preamble).toContain("breaklines=true");
  });

  it("makes a cover page or a title block", () => {
    expect(latexLayout({ ...academic, cover: "page" }).preamble).toContain(
      "\\begin{titlepage}",
    );
    expect(latexLayout({ ...academic, cover: "block" }).preamble).not.toContain(
      "titlepage",
    );
  });

  it("produces a balanced preamble for every template", () => {
    for (const template of TEMPLATES) {
      const { preamble } = latexLayout(templateSettings(template.id));
      const opened = preamble.match(/\{/g)?.length ?? 0;
      const closed = preamble.match(/\}/g)?.length ?? 0;
      expect(opened, template.id).toBe(closed);
      expect(preamble.match(/\\makeatletter/g)?.length).toBe(
        preamble.match(/\\makeatother/g)?.length,
      );
    }
  });
});

describe("previewLayoutOptions", () => {
  it("passes only what changes the preview's markup", () => {
    expect(previewLayoutOptions({ ...academic, numberSections: false })).toEqual([
      "--variable=lang:es",
      "--variable=abstract-title:Resumen",
    ]);
    expect(
      previewLayoutOptions({ ...academic, tableOfContents: true, language: "en" }),
    ).toEqual(
      expect.arrayContaining([
        "--number-sections",
        "--toc",
        "--variable=toc-title:Contents",
      ]),
    );
  });
});
