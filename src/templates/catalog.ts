import {
  type CitationStyle,
  type DocumentSettings,
  type Language,
  settingsKey,
  type TemplateId,
} from "./settings";

/** How the document is divided: sections, or chapters with front matter. */
export type DocumentStructure = "article" | "book";

/** The settings a template brings; the language belongs to the document, not to it. */
export type TemplateDefaults = Omit<
  DocumentSettings,
  "templateId" | "language" | "citationStyle"
>;

export interface DocumentTemplate {
  readonly id: TemplateId;
  readonly name: string;
  /** What sets it apart, in one line. */
  readonly description: string;
  readonly structure: DocumentStructure;
  readonly defaults: TemplateDefaults;
}

const margins = (top: number, bottom: number, left: number, right: number) => ({
  top,
  bottom,
  left,
  right,
});

/** The template library, in the order it is offered. */
export const TEMPLATES: readonly DocumentTemplate[] = [
  {
    id: "academic-paper",
    name: "Artículo académico",
    description: "Libertinus a 11 pt, título sobre el texto y secciones numeradas.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(25, 25, 25, 25),
      font: "libertinus",
      fontSize: 11,
      lineSpacing: 1,
      header: "none",
      footer: "page-center",
      numberSections: true,
      tableOfContents: false,
      cover: "block",
    },
  },
  {
    id: "university-assignment",
    name: "Trabajo universitario",
    description:
      "Portada, interlineado de 1,5 y el título en la cabecera de cada página.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(25, 25, 30, 25),
      font: "termes",
      fontSize: 12,
      lineSpacing: 1.5,
      header: "title",
      footer: "page-center",
      numberSections: true,
      tableOfContents: false,
      cover: "page",
    },
  },
  {
    id: "research-paper",
    name: "Artículo de investigación",
    description:
      "Compacto: Termes a 10 pt y márgenes estrechos para caber en pocas páginas.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(20, 20, 20, 20),
      font: "termes",
      fontSize: 10,
      lineSpacing: 1,
      header: "title",
      footer: "page-center",
      numberSections: true,
      tableOfContents: false,
      cover: "block",
    },
  },
  {
    id: "thesis",
    name: "Tesis",
    description:
      "Capítulos, portada, índice y un margen izquierdo amplio para encuadernar.",
    structure: "book",
    defaults: {
      paperSize: "a4",
      margins: margins(30, 25, 35, 25),
      font: "pagella",
      fontSize: 12,
      lineSpacing: 1.5,
      header: "section",
      footer: "page-outer",
      numberSections: true,
      tableOfContents: true,
      cover: "page",
    },
  },
  {
    id: "technical-documentation",
    name: "Documentación técnica",
    description: "Heros sin remates, portada, índice y «página X de Y» al pie.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(22, 22, 22, 22),
      font: "heros",
      fontSize: 10,
      lineSpacing: 1.15,
      header: "title-section",
      footer: "page-of-total",
      numberSections: true,
      tableOfContents: true,
      cover: "page",
    },
  },
  {
    id: "mathematical-report",
    name: "Informe matemático",
    description:
      "Latin Modern, el aspecto clásico de LaTeX, con la sección en la cabecera.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(25, 25, 28, 28),
      font: "latin-modern",
      fontSize: 11,
      lineSpacing: 1.15,
      header: "section",
      footer: "page-center",
      numberSections: true,
      tableOfContents: false,
      cover: "block",
    },
  },
  {
    id: "minimal",
    name: "Documento mínimo",
    description: "Sin numeración ni cabeceras: solo el texto y el número de página.",
    structure: "article",
    defaults: {
      paperSize: "a4",
      margins: margins(25, 25, 25, 25),
      font: "latin-modern",
      fontSize: 11,
      lineSpacing: 1,
      header: "none",
      footer: "page-center",
      numberSections: false,
      tableOfContents: false,
      cover: "block",
    },
  },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "academic-paper";

const BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]));

export function templateById(id: TemplateId): DocumentTemplate {
  const template = BY_ID.get(id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  return template;
}

/** A template's settings, for a document in the given language. */
/**
 * A template's settings. The language and the citation style belong to the document
 * rather than its look, so they carry over from one template to another.
 */
export function templateSettings(
  id: TemplateId,
  language: Language = "es",
  citationStyle: CitationStyle = "chicago-author-date",
): DocumentSettings {
  return { templateId: id, ...templateById(id).defaults, language, citationStyle };
}

/** The settings of a new document. */
export const DEFAULT_SETTINGS: DocumentSettings = templateSettings(DEFAULT_TEMPLATE_ID);

/** True when the settings differ from those of their own template. */
export function isCustomized(settings: DocumentSettings): boolean {
  return (
    settingsKey(settings) !==
    settingsKey(
      templateSettings(settings.templateId, settings.language, settings.citationStyle),
    )
  );
}
