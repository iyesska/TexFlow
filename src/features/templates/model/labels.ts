import type {
  CoverStyle,
  FontId,
  FooterStyle,
  HeaderStyle,
  Language,
  LineSpacing,
} from "@/templates/settings";

/** How each design option is named in the interface. */

export const FONT_LABELS: Readonly<Record<FontId, { name: string; hint: string }>> = {
  libertinus: { name: "Libertinus", hint: "Serif clásica, de lectura cómoda" },
  "latin-modern": { name: "Latin Modern", hint: "La tipografía de LaTeX" },
  pagella: { name: "Pagella", hint: "Al estilo de Palatino" },
  termes: { name: "Termes", hint: "Al estilo de Times" },
  heros: { name: "Heros", hint: "Sin remates, al estilo de Helvetica" },
};

export const LINE_SPACING_LABELS: Readonly<Record<LineSpacing, string>> = {
  1: "1",
  1.15: "1,15",
  1.5: "1,5",
  2: "2",
};

export const HEADER_LABELS: Readonly<Record<HeaderStyle, string>> = {
  none: "Nada",
  title: "Título del documento",
  section: "Sección actual",
  "title-section": "Título y sección actual",
};

export const FOOTER_LABELS: Readonly<Record<FooterStyle, string>> = {
  none: "Nada",
  "page-center": "Número de página, centrado",
  "page-outer": "Número de página, a la derecha",
  "page-of-total": "Número y total, como «3 de 12»",
};

export const COVER_LABELS: Readonly<Record<CoverStyle, string>> = {
  block: "Sobre el texto",
  page: "En su propia página",
};

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  es: "Español",
  en: "English",
};
