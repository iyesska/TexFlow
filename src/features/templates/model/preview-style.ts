import type { CSSProperties } from "react";

import { templateById } from "@/templates/catalog";
import {
  PAPER_SIZES,
  type DocumentSettings,
  type FontId,
  type FontSize,
  type Language,
} from "@/templates/settings";

/**
 * How the quick preview imitates the PDF: the page, the typeface and LaTeX's own
 * type sizes, as CSS custom properties for src/styles/document.css.
 */

/** Font stacks, best match first. The --font-tf-* faces are those LaTeX embeds. */
export const FONT_STACKS: Readonly<Record<FontId, string>> = {
  libertinus: 'var(--font-libertinus-serif), "Libertinus Serif", serif',
  "latin-modern": 'var(--font-tf-latin-modern), "Latin Modern Roman", serif',
  pagella:
    'var(--font-tf-pagella), "TeX Gyre Pagella", "Palatino Linotype", Palatino, serif',
  termes: 'var(--font-tf-termes), "TeX Gyre Termes", "Times New Roman", Times, serif',
  heros: 'var(--font-tf-heros), "TeX Gyre Heros", Helvetica, Arial, sans-serif',
};

/**
 * KaTeX draws formulas in Computer Modern. Beside a text face with a larger x-height,
 * that reads small; these factors bring it level.
 */
const MATH_SCALE: Readonly<Record<FontId, number>> = {
  libertinus: 1.08,
  "latin-modern": 1,
  pagella: 1.06,
  termes: 1.04,
  heros: 1.06,
};

interface TexSizes {
  /** \normalsize and its \baselineskip, in points. */
  readonly normal: number;
  readonly baseline: number;
  readonly small: number;
  readonly large: number;
  readonly Large: number;
  readonly LARGE: number;
  readonly huge: number;
  readonly Huge: number;
}

/** The type sizes of LaTeX's standard classes, in points, by class option. */
const TEX_SIZES: Readonly<Record<FontSize, TexSizes>> = {
  10: {
    normal: 10,
    baseline: 12,
    small: 9,
    large: 12,
    Large: 14.4,
    LARGE: 17.28,
    huge: 20.74,
    Huge: 24.88,
  },
  11: {
    normal: 10.95,
    baseline: 13.6,
    small: 10,
    large: 12,
    Large: 14.4,
    LARGE: 17.28,
    huge: 20.74,
    Huge: 24.88,
  },
  12: {
    normal: 12,
    baseline: 14.5,
    small: 10.95,
    large: 14.4,
    Large: 17.28,
    LARGE: 20.74,
    huge: 24.88,
    Huge: 24.88,
  },
};

/** The words LaTeX writes in captions and headings, in the document's language. */
const LABELS: Readonly<
  Record<Language, { figure: string; table: string; chapter: string }>
> = {
  es: { figure: "Figura", table: "Tabla", chapter: "Capítulo" },
  en: { figure: "Figure", table: "Table", chapter: "Chapter" },
};

const PX_PER_MM = 96 / 25.4;

const mm = (value: number) => `${value}mm`;
const pt = (value: number) => `${value}pt`;
const quoted = (text: string) => JSON.stringify(text);

/** The custom properties that lay out the preview's sheets for these settings. */
export function previewStyle(settings: DocumentSettings): CSSProperties {
  const paper = PAPER_SIZES[settings.paperSize];
  const sizes = TEX_SIZES[settings.fontSize];
  const labels = LABELS[settings.language];
  const { top, bottom, left, right } = settings.margins;

  return {
    "--page-width": mm(paper.width),
    "--page-height": mm(paper.height),
    "--page-margin-top": mm(top),
    "--page-margin-bottom": mm(bottom),
    "--page-margin-left": mm(left),
    "--page-margin-right": mm(right),
    "--page-font-family": FONT_STACKS[settings.font],
    "--page-font-size": pt(sizes.normal),
    // setspace multiplies the class's baseline skip; CSS wants it as a ratio.
    "--page-line-height": String(
      Math.round((sizes.baseline / sizes.normal) * settings.lineSpacing * 1000) / 1000,
    ),
    "--page-math-scale": String(MATH_SCALE[settings.font]),
    "--tex-small": pt(sizes.small),
    "--tex-large": pt(sizes.large),
    "--tex-Large": pt(sizes.Large),
    "--tex-LARGE": pt(sizes.LARGE),
    "--tex-huge": pt(sizes.huge),
    "--tex-Huge": pt(sizes.Huge),
    "--figure-label": quoted(labels.figure),
    "--table-label": quoted(labels.table),
    "--chapter-label": quoted(labels.chapter),
  } as CSSProperties;
}

/** Attributes for the document element: its language, for hyphenation, and structure. */
export function documentAttributes(settings: DocumentSettings) {
  return {
    lang: settings.language,
    "data-structure": templateById(settings.templateId).structure,
  } as const;
}

/** Width of a page at 100 %, in CSS pixels, for fitting it to the pane. */
export function pageWidthPx(settings: DocumentSettings): number {
  return PAPER_SIZES[settings.paperSize].width * PX_PER_MM;
}
