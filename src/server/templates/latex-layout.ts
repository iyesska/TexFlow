import "server-only";

import { templateById } from "@/templates/catalog";
import type {
  CoverStyle,
  DocumentSettings,
  FontId,
  FooterStyle,
  HeaderStyle,
  Language,
} from "@/templates/settings";

/**
 * Turns design settings into the Pandoc options and the LaTeX preamble that lay the
 * document out.
 *
 * Settings are validated enums and bounded integers, so every value written here is
 * known in advance: nothing from the document's text ever reaches this preamble.
 */

/** File name of the generated preamble inside the job directory. */
export const PREAMBLE_FILE = "texflow-layout.tex";

export interface LatexLayout {
  /** Pandoc command-line options. */
  readonly options: string[];
  /** LaTeX for the document's preamble, passed to Pandoc as a header include. */
  readonly preamble: string;
}

interface FontSetup {
  /** For pdfLaTeX, so an exported .tex also compiles there (on Overleaf, say). */
  readonly pdftex: string;
  /** For XeLaTeX and LuaLaTeX, which TexFlow uses. */
  readonly unicode: string;
}

const otfFamily = (name: string, faces: [string, string, string, string]) =>
  `\\setmainfont{${name}}[Extension=.otf, UprightFont=*-${faces[0]}, BoldFont=*-${faces[1]}, ItalicFont=*-${faces[2]}, BoldItalicFont=*-${faces[3]}]`;

const LOWER_FACES: [string, string, string, string] = [
  "regular",
  "bold",
  "italic",
  "bolditalic",
];
const UPPER_FACES: [string, string, string, string] = [
  "Regular",
  "Bold",
  "Italic",
  "BoldItalic",
];

const FONT_SETUP: Readonly<Record<FontId, FontSetup>> = {
  libertinus: {
    pdftex: "\\usepackage{libertinus}",
    unicode: [
      otfFamily("LibertinusSerif", UPPER_FACES),
      "\\setmathfont{LibertinusMath-Regular.otf}",
    ].join("\n  "),
  },
  // Latin Modern is what LaTeX uses when nothing else is said.
  "latin-modern": { pdftex: "", unicode: "" },
  pagella: {
    pdftex: "\\usepackage{tgpagella}",
    unicode: [
      otfFamily("texgyrepagella", LOWER_FACES),
      "\\setmathfont{texgyrepagella-math.otf}",
    ].join("\n  "),
  },
  termes: {
    pdftex: "\\usepackage{tgtermes}",
    unicode: [
      otfFamily("texgyretermes", LOWER_FACES),
      "\\setmathfont{texgyretermes-math.otf}",
    ].join("\n  "),
  },
  // A sans-serif text keeps serif mathematics, as is usual.
  heros: {
    pdftex: "\\usepackage{tgheros}\n  \\renewcommand*{\\familydefault}{\\sfdefault}",
    unicode: otfFamily("texgyreheros", LOWER_FACES),
  },
};

function fontPreamble(font: FontId): string[] {
  const { pdftex, unicode } = FONT_SETUP[font];
  if (!pdftex && !unicode) return [];
  return ["\\ifPDFTeX", `  ${pdftex}`, "\\else", `  ${unicode}`, "\\fi"];
}

/** Words the layout writes on the page, in the document's language. */
const WORDS: Readonly<Record<Language, { readonly of: string }>> = {
  es: { of: "de" },
  en: { of: "of" },
};

function captionsPreamble(language: Language): string[] {
  // Babel's Spanish calls tables "Cuadro"; "Tabla" is what most readers expect.
  return language === "es"
    ? ["\\addto\\captionsspanish{\\renewcommand{\\tablename}{Tabla}}"]
    : [];
}

/**
 * Keeps a copy of the title for the running header: \maketitle empties \@title once
 * the title is set. Pandoc writes \title after the header includes, so this sees it.
 */
const TITLE_CAPTURE = [
  "\\providecommand{\\texflowtitle}{}",
  "\\let\\texflow@title\\title",
  "\\renewcommand{\\title}[1]{\\texflow@title{#1}\\gdef\\texflowtitle{#1}}",
];

const AUTHOR =
  "\\ifx\\@author\\@empty\\else{\\large\\begin{tabular}[t]{c}\\@author\\end{tabular}\\par}\\fi";
const COVER_AUTHOR =
  "\\ifx\\@author\\@empty\\else{\\Large\\begin{tabular}[t]{c}\\@author\\end{tabular}\\par}\\fi";

function maketitlePreamble(cover: CoverStyle, book: boolean): string[] {
  if (cover === "block") {
    return [
      "\\renewcommand{\\maketitle}{%",
      "  \\begingroup\\centering",
      "  {\\LARGE\\@title\\par}\\vskip 1.4em",
      `  ${AUTHOR}`,
      "  \\ifx\\@date\\@empty\\else\\vskip 0.8em{\\large\\@date\\par}\\fi",
      "  \\par\\endgroup\\vskip 2.2em",
      "  \\thispagestyle{plain}%",
      "}",
    ];
  }
  // The cover is numbered A, B... so its page anchors cannot clash with page 1.
  return [
    "\\renewcommand{\\maketitle}{%",
    "  \\begin{titlepage}\\pagenumbering{Alph}\\centering",
    "  \\vspace*{0.22\\textheight}",
    "  {\\Huge\\bfseries\\@title\\par}\\vspace{2.5em}",
    `  ${COVER_AUTHOR}`,
    "  \\vfill",
    "  \\ifx\\@date\\@empty\\else{\\large\\@date\\par}\\fi",
    "  \\end{titlepage}",
    `  \\pagenumbering{${book ? "roman" : "arabic"}}%`,
    "}",
  ];
}

/**
 * The book class has chapters but no abstract environment; Pandoc writes one. And the
 * main matter starts with a clean running head, not the last one of the front matter.
 */
const BOOK_ADDITIONS = [
  "\\@ifundefined{abstract}{%",
  "  \\newenvironment{abstract}{\\chapter*{\\abstractname}\\thispagestyle{plain}}{\\clearpage}%",
  "}{}",
  "\\g@addto@macro\\mainmatter{\\markboth{}{}}",
];

/**
 * Pandoc loads listings for code but leaves its style to the class: code would be set
 * in the text face. Monospaced, smaller, and long lines broken instead of overflowing.
 */
const CODE_STYLE = [
  "\\@ifpackageloaded{listings}{%",
  "  \\lstset{basicstyle=\\ttfamily\\small, columns=fullflexible, keepspaces=true,",
  "    breaklines=true, showstringspaces=false, upquote=true}%",
  "}{}",
];

const SECTION_MARK = "\\ifnum\\c@secnumdepth>\\z@\\thesection\\quad\\fi";
const CHAPTER_MARK = "\\ifnum\\c@secnumdepth>\\m@ne\\@chapapp\\ \\thechapter.\\ \\fi";

function headerContent(header: HeaderStyle): string[] {
  const title = "\\small\\texflowtitle";
  const section = "\\small\\nouppercase{\\leftmark}";
  switch (header) {
    case "none":
      return [];
    case "title":
      return [`\\fancyhead[L]{${title}}`];
    case "section":
      return [`\\fancyhead[R]{${section}}`];
    case "title-section":
      return [`\\fancyhead[L]{${title}}`, `\\fancyhead[R]{${section}}`];
  }
}

function footerContent(footer: FooterStyle, language: Language): string[] {
  switch (footer) {
    case "none":
      return [];
    case "page-center":
      return ["\\fancyfoot[C]{\\thepage}"];
    case "page-outer":
      return ["\\fancyfoot[R]{\\thepage}"];
    case "page-of-total":
      return [`\\fancyfoot[C]{\\thepage\\ ${WORDS[language].of} \\pageref*{LastPage}}`];
  }
}

function pageStylePreamble(settings: DocumentSettings, book: boolean): string[] {
  const footer = footerContent(settings.footer, settings.language);
  return [
    "\\usepackage{fancyhdr}",
    ...(settings.footer === "page-of-total" ? ["\\usepackage{lastpage}"] : []),
    "\\pagestyle{fancy}",
    "\\fancyhf{}",
    `\\renewcommand{\\headrulewidth}{${settings.header === "none" ? "0pt" : "0.4pt"}}`,
    ...headerContent(settings.header),
    ...footer,
    // Chapter openings and the title page use the plain style: the footer alone.
    `\\fancypagestyle{plain}{\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}${footer.join("")}}`,
    "\\makeatletter",
    book
      ? `\\renewcommand{\\chaptermark}[1]{\\markboth{${CHAPTER_MARK}#1}{}}`
      : `\\renewcommand{\\sectionmark}[1]{\\markboth{${SECTION_MARK}#1}{}}`,
    "\\makeatother",
  ];
}

export function latexLayout(settings: DocumentSettings): LatexLayout {
  const template = templateById(settings.templateId);
  const book = template.structure === "book";
  const { top, bottom, left, right } = settings.margins;

  const options = [
    `--variable=documentclass:${book ? "book" : "article"}`,
    ...(book
      ? [
          "--variable=classoption:oneside",
          "--variable=classoption:openany",
          "--top-level-division=chapter",
        ]
      : []),
    `--variable=papersize:${settings.paperSize}`,
    `--variable=fontsize:${settings.fontSize}pt`,
    `--variable=geometry:top=${top}mm`,
    `--variable=geometry:bottom=${bottom}mm`,
    `--variable=geometry:left=${left}mm`,
    `--variable=geometry:right=${right}mm`,
    "--variable=geometry:headheight=15pt",
    ...(settings.lineSpacing === 1
      ? []
      : [`--variable=linestretch:${settings.lineSpacing}`]),
    `--variable=lang:${settings.language}`,
    ...(settings.numberSections ? ["--number-sections"] : []),
    ...(settings.tableOfContents ? ["--toc"] : []),
    `--include-in-header=${PREAMBLE_FILE}`,
  ];

  const preamble = [
    `% Diseño de TexFlow: ${template.name}.`,
    ...fontPreamble(settings.font),
    ...captionsPreamble(settings.language),
    "\\makeatletter",
    ...TITLE_CAPTURE,
    ...maketitlePreamble(settings.cover, book),
    ...(book ? BOOK_ADDITIONS : []),
    ...CODE_STYLE,
    "\\makeatother",
    ...pageStylePreamble(settings, book),
    "",
  ].join("\n");

  return { options, preamble };
}

const TOC_TITLE: Readonly<Record<Language, string>> = { es: "Índice", en: "Contents" };
const ABSTRACT_TITLE: Readonly<Record<Language, string>> = {
  es: "Resumen",
  en: "Abstract",
};

/** Pandoc options for the quick preview's HTML: only what changes its markup. */
export function previewLayoutOptions(settings: DocumentSettings): string[] {
  return [
    `--variable=lang:${settings.language}`,
    `--variable=abstract-title:${ABSTRACT_TITLE[settings.language]}`,
    ...(settings.numberSections ? ["--number-sections"] : []),
    ...(settings.tableOfContents
      ? ["--toc", `--variable=toc-title:${TOC_TITLE[settings.language]}`]
      : []),
  ];
}
