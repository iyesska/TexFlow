"use client";

import type { StateCommand } from "@codemirror/state";
import {
  BookMarked,
  Code,
  Columns3,
  FileArchive,
  FileCode,
  FileDown,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  History,
  Keyboard,
  LayoutTemplate,
  LibraryBig,
  ListChecks,
  Monitor,
  Moon,
  Play,
  Quote,
  RotateCcw,
  Save,
  Sigma,
  SquareCode,
  Sun,
  Table,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SHORTCUTS } from "@/config/shortcuts";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import {
  BLOCK_TEMPLATES,
  insertBlock,
  toggleHeading,
} from "@/features/editor/codemirror/commands";
import { useEditorSessionCache } from "@/features/editor/hooks/use-editor-session-cache";
import { useExports } from "@/features/export/hooks/use-exports";
import { useFirstSteps } from "@/features/onboarding/hooks/use-first-steps";
import { useDesign } from "@/features/templates/hooks/use-design";
import { CITATION_STYLE_LABELS } from "@/features/templates/model/labels";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";
import {
  useOpenPanel,
  type WorkspacePanel,
} from "@/features/workspace/hooks/use-workspace-panels";
import {
  PANE_IDS,
  type LayoutAction,
  type PaneId,
} from "@/features/workspace/model/layout";
import type { KeyCombo } from "@/lib/keyboard";
import { TEMPLATES } from "@/templates/catalog";
import { CITATION_STYLES } from "@/templates/settings";

import type { Searchable } from "../model/search";

export interface Command extends Searchable {
  readonly id: string;
  /** The heading it is listed under. */
  readonly group: string;
  readonly icon: LucideIcon;
  readonly shortcut?: KeyCombo;
  /** A word shown at the end of the row, such as "Actual". */
  readonly hint?: string;
  run(): void;
}

/** What the commands act on: the workspace's parts, gathered once per render. */
interface CommandContext {
  readonly splitView: boolean;
  readonly openPanel: (panel: WorkspacePanel) => void;
  readonly dispatch: (action: LayoutAction) => void;
  readonly session: ReturnType<typeof useDocumentSession>;
  readonly router: ReturnType<typeof useRouter>;
  readonly editor: ReturnType<typeof useEditorSessionCache>;
  readonly compilation: ReturnType<typeof useCompilation>;
  readonly exports: ReturnType<typeof useExports>;
  readonly design: ReturnType<typeof useDesign>;
  readonly setTheme: (theme: string) => void;
  readonly firstSteps: ReturnType<typeof useFirstSteps>["store"];
}

function documentCommands({ session, router, openPanel }: CommandContext): Command[] {
  const group = "Documento";
  return [
    {
      id: "save",
      group,
      label: "Guardar ahora",
      keywords: ["salvar"],
      icon: Save,
      shortcut: SHORTCUTS.saveDocument,
      run: () => void session.flush(),
    },
    {
      id: "history",
      group,
      label: "Historial de versiones",
      keywords: ["restaurar", "versión", "deshacer", "recuperar"],
      icon: History,
      run: () => openPanel("history"),
    },
    {
      id: "references",
      group,
      label: "Referencias del documento",
      keywords: ["bibliografía", "citas", "bibtex", "fuentes"],
      icon: BookMarked,
      run: () => openPanel("references"),
    },
    {
      id: "design",
      group,
      label: "Diseño del documento",
      keywords: ["plantilla", "márgenes", "tipografía", "aspecto"],
      icon: LayoutTemplate,
      run: () => openPanel("design"),
    },
    {
      id: "library",
      group,
      label: "Volver a tus documentos",
      keywords: ["biblioteca", "salir", "lista"],
      icon: LibraryBig,
      run: () => void session.flush().then(() => router.push("/documents")),
    },
  ];
}

const INSERTIONS: readonly (readonly [string, LucideIcon, StateCommand, string[]])[] = [
  ["Título", Heading1, toggleHeading(1), ["encabezado", "h1"]],
  ["Sección", Heading2, toggleHeading(2), ["encabezado", "h2"]],
  ["Subsección", Heading3, toggleHeading(3), ["encabezado", "h3"]],
  ["Tabla", Table, insertBlock(BLOCK_TEMPLATES.table), ["columnas", "filas"]],
  ["Bloque de código", SquareCode, insertBlock(BLOCK_TEMPLATES.codeBlock), ["programa"]],
  [
    "Fórmula en bloque",
    Sigma,
    insertBlock(BLOCK_TEMPLATES.mathBlock),
    ["ecuación", "matemáticas", "latex"],
  ],
  ["Nota al pie", Quote, insertBlock(BLOCK_TEMPLATES.footnote), ["referencia"]],
];

function insertCommands({ dispatch, editor }: CommandContext): Command[] {
  return INSERTIONS.map(([label, icon, command, keywords]) => ({
    id: `insert-${label}`,
    group: "Insertar",
    label,
    keywords: ["insertar", "añadir", ...keywords],
    icon,
    // Edits happen in the editor: it is shown first if it is not on screen.
    run: () => {
      dispatch({ type: "activate", pane: "markdown" });
      editor.run(command);
    },
  }));
}

function outputCommands({ dispatch, compilation, exports }: CommandContext): Command[] {
  const group = "PDF y exportación";
  return [
    {
      id: "compile",
      group,
      label: "Compilar el PDF",
      keywords: ["latex", "tectonic", "generar"],
      icon: Play,
      shortcut: SHORTCUTS.compile,
      run: () => {
        dispatch({ type: "activate", pane: "preview" });
        compilation.setMode("pdf");
        void compilation.compile();
      },
    },
    {
      id: "export-pdf",
      group,
      label: "Descargar el PDF",
      keywords: ["exportar"],
      icon: FileDown,
      run: exports.exportPdf,
    },
    {
      id: "export-tex",
      group,
      label: "Descargar el LaTeX (.tex)",
      keywords: ["exportar", "tex"],
      icon: FileCode,
      run: exports.exportLatex,
    },
    {
      id: "export-md",
      group,
      label: "Descargar el Markdown (.md)",
      keywords: ["exportar", "md"],
      icon: FileText,
      run: exports.exportMarkdown,
    },
    {
      id: "export-zip",
      group,
      label: "Descargar el proyecto completo (.zip)",
      keywords: ["exportar", "zip", "imágenes", "bib"],
      icon: FileArchive,
      run: exports.exportProject,
    },
  ];
}

const PANE_NAMES: Readonly<Record<PaneId, string>> = {
  markdown: "Markdown",
  latex: "LaTeX",
  preview: "la vista previa",
};

const PANE_ICONS: Readonly<Record<PaneId, LucideIcon>> = {
  markdown: FileText,
  latex: Code,
  preview: Monitor,
};

function paneCommands({ splitView, dispatch }: CommandContext): Command[] {
  const group = "Paneles";
  return [
    ...PANE_IDS.map((pane) => ({
      id: `pane-${pane}`,
      group,
      label: splitView
        ? `Mostrar u ocultar ${PANE_NAMES[pane]}`
        : `Ver ${PANE_NAMES[pane]}`,
      keywords: ["panel", "vista"],
      icon: PANE_ICONS[pane],
      shortcut: SHORTCUTS.togglePane[pane],
      run: () =>
        dispatch(splitView ? { type: "toggle", pane } : { type: "activate", pane }),
    })),
    {
      id: "panes-all",
      group,
      label: "Mostrar los tres paneles",
      keywords: ["panel", "vista", "todos"],
      icon: Columns3,
      shortcut: SHORTCUTS.showAllPanes,
      run: () => dispatch({ type: "showAll" }),
    },
    {
      id: "panes-reset",
      group,
      label: "Restablecer la distribución",
      keywords: ["panel", "diseño", "anchura"],
      icon: RotateCcw,
      run: () => {
        dispatch({ type: "reset" });
        toast.success("Distribución restablecida");
      },
    },
  ];
}

function designCommands({ design }: CommandContext): Command[] {
  const group = "Plantillas";
  const { templateId, citationStyle } = design.settings;
  return [
    ...TEMPLATES.map((template) => ({
      id: `template-${template.id}`,
      group,
      label: `Plantilla: ${template.name}`,
      keywords: ["plantilla", "diseño", template.description],
      icon: LayoutTemplate,
      hint: templateId === template.id ? "Actual" : undefined,
      run: () => design.applyTemplate(template.id),
    })),
    ...CITATION_STYLES.map((style) => ({
      id: `citations-${style}`,
      group,
      label: `Citas: ${CITATION_STYLE_LABELS[style].name}`,
      keywords: [
        "estilo",
        "referencias",
        "bibliografía",
        CITATION_STYLE_LABELS[style].example,
      ],
      icon: Quote,
      hint: citationStyle === style ? "Actual" : undefined,
      run: () => void design.update({ citationStyle: style }),
    })),
  ];
}

const THEMES: readonly (readonly [string, string, LucideIcon, string])[] = [
  ["dark", "Tema oscuro", Moon, "noche"],
  ["light", "Tema claro", Sun, "día"],
  ["system", "Tema del sistema", Monitor, "automático"],
];

function helpCommands({ setTheme, openPanel, firstSteps }: CommandContext): Command[] {
  return [
    ...THEMES.map(([theme, label, icon, keyword]) => ({
      id: `theme-${theme}`,
      group: "Apariencia",
      label,
      keywords: [keyword, "apariencia"],
      icon,
      run: () => setTheme(theme),
    })),
    {
      id: "shortcuts",
      group: "Ayuda",
      label: "Atajos de teclado",
      keywords: ["teclas", "ayuda", "combinaciones"],
      icon: Keyboard,
      run: () => openPanel("shortcuts"),
    },
    {
      id: "guide",
      group: "Ayuda",
      label: "Primeros pasos",
      keywords: ["guía", "ayuda", "empezar", "tutorial"],
      icon: ListChecks,
      run: () => {
        firstSteps.show();
        openPanel("guide");
      },
    },
  ];
}

/** Everything the workspace can do, as the command palette lists it. */
export function useWorkspaceCommands(splitView: boolean): readonly Command[] {
  const context: CommandContext = {
    splitView,
    openPanel: useOpenPanel(),
    dispatch: useWorkspaceLayout().dispatch,
    session: useDocumentSession(),
    router: useRouter(),
    editor: useEditorSessionCache(),
    compilation: useCompilation(),
    exports: useExports(),
    design: useDesign(),
    setTheme: useTheme().setTheme,
    firstSteps: useFirstSteps().store,
  };
  return [
    ...documentCommands(context),
    ...insertCommands(context),
    ...outputCommands(context),
    ...paneCommands(context),
    ...designCommands(context),
    ...helpCommands(context),
  ];
}
