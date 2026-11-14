import { z } from "zod";

/**
 * A document's design settings: everything about how it is laid out and typeset,
 * nothing about what it says. Shared by the browser, which edits them and draws the
 * quick preview, and the server, which turns them into LaTeX.
 *
 * Every value is one of a fixed set or a bounded number, so the server can write them
 * into LaTeX without escaping anything.
 */

export const TEMPLATE_IDS = [
  "academic-paper",
  "university-assignment",
  "research-paper",
  "thesis",
  "technical-documentation",
  "mathematical-report",
  "minimal",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Paper sizes, in millimetres. */
export const PAPER_SIZES = {
  a4: { label: "A4", width: 210, height: 297 },
  letter: { label: "Carta", width: 215.9, height: 279.4 },
  a5: { label: "A5", width: 148, height: 210 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

export const FONTS = [
  "libertinus",
  "latin-modern",
  "pagella",
  "termes",
  "heros",
] as const;

export type FontId = (typeof FONTS)[number];

export const FONT_SIZES = [10, 11, 12] as const;

export type FontSize = (typeof FONT_SIZES)[number];

/** Multiples of the font's natural line spacing. */
export const LINE_SPACINGS = [1, 1.15, 1.5, 2] as const;

export type LineSpacing = (typeof LINE_SPACINGS)[number];

/** What runs along the top of each page. */
export const HEADER_STYLES = ["none", "title", "section", "title-section"] as const;

export type HeaderStyle = (typeof HEADER_STYLES)[number];

/** What runs along the foot of each page. */
export const FOOTER_STYLES = [
  "none",
  "page-center",
  "page-outer",
  "page-of-total",
] as const;

export type FooterStyle = (typeof FOOTER_STYLES)[number];

/** "block": title above the text on the first page. "page": a cover page of its own. */
export const COVER_STYLES = ["block", "page"] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];

/** The document's language: hyphenation and the words LaTeX writes (Figura, Índice). */
export const LANGUAGES = ["es", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

/**
 * How citations and the list of references are written. Chicago is Pandoc's own
 * default; the others are CSL styles shipped in pandoc/csl.
 */
export const CITATION_STYLES = ["chicago-author-date", "apa", "ieee"] as const;

export type CitationStyle = (typeof CITATION_STYLES)[number];

export const MARGIN_LIMITS = { min: 10, max: 60 } as const;

/** The text block can never be narrower or shorter than this, in millimetres. */
export const MIN_TEXT_AREA = { width: 60, height: 80 } as const;

const margin = z.number().int().min(MARGIN_LIMITS.min).max(MARGIN_LIMITS.max);

const literal = <const Values extends readonly [number, ...number[]]>(values: Values) =>
  z.union(
    values.map((value) => z.literal(value)) as unknown as [
      z.ZodLiteral<Values[number]>,
      z.ZodLiteral<Values[number]>,
      ...z.ZodLiteral<Values[number]>[],
    ],
  );

export const documentSettingsSchema = z
  .object({
    templateId: z.enum(TEMPLATE_IDS),
    paperSize: z.enum(Object.keys(PAPER_SIZES) as [PaperSize, ...PaperSize[]]),
    margins: z.object({ top: margin, bottom: margin, left: margin, right: margin }),
    font: z.enum(FONTS),
    fontSize: literal(FONT_SIZES),
    lineSpacing: literal(LINE_SPACINGS),
    header: z.enum(HEADER_STYLES),
    footer: z.enum(FOOTER_STYLES),
    numberSections: z.boolean(),
    tableOfContents: z.boolean(),
    cover: z.enum(COVER_STYLES),
    language: z.enum(LANGUAGES),
    // Documents saved before citations existed have none: they get the default.
    citationStyle: z.enum(CITATION_STYLES).default("chicago-author-date"),
  })
  .superRefine((settings, context) => {
    const paper = PAPER_SIZES[settings.paperSize];
    const { top, bottom, left, right } = settings.margins;
    if (paper.width - left - right < MIN_TEXT_AREA.width) {
      context.addIssue({
        code: "custom",
        path: ["margins"],
        message: `Los márgenes izquierdo y derecho dejan menos de ${MIN_TEXT_AREA.width / 10} cm para el texto.`,
      });
    }
    if (paper.height - top - bottom < MIN_TEXT_AREA.height) {
      context.addIssue({
        code: "custom",
        path: ["margins"],
        message: `Los márgenes superior e inferior dejan menos de ${MIN_TEXT_AREA.height / 10} cm para el texto.`,
      });
    }
  });

export type DocumentSettings = z.infer<typeof documentSettingsSchema>;

/**
 * A stable string for a set of settings: equal settings always give the same key,
 * whatever order their fields were written in. Used to tell when a result is current.
 */
export function settingsKey(settings: DocumentSettings): string {
  const { margins } = settings;
  return [
    settings.templateId,
    settings.paperSize,
    margins.top,
    margins.bottom,
    margins.left,
    margins.right,
    settings.font,
    settings.fontSize,
    settings.lineSpacing,
    settings.header,
    settings.footer,
    settings.numberSections,
    settings.tableOfContents,
    settings.cover,
    settings.language,
    settings.citationStyle,
  ].join("|");
}
