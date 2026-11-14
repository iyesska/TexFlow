"use client";

import { useEffect } from "react";

import { ShortcutKeys } from "@/components/shortcut-keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { SHORTCUTS } from "@/config/shortcuts";
import { usePanel } from "@/features/workspace/hooks/use-workspace-panels";
import { useIsMac } from "@/hooks/use-is-mac";
import type { KeyCombo } from "@/lib/keyboard";

interface Row {
  readonly label: string;
  /** One or more combinations, any of which works. */
  readonly combos?: readonly KeyCombo[];
  /** Keys typed rather than pressed together, such as "/" at the start of a line. */
  readonly typed?: string;
  readonly note?: string;
}

const { format, togglePane } = SHORTCUTS;

function sections(isMac: boolean): readonly (readonly [string, readonly Row[]])[] {
  // Headings use the one combination each platform leaves free (see the editor keymap).
  const heading = (digit: 1 | 2 | 3): KeyCombo =>
    isMac
      ? { code: `Digit${digit}`, mod: true, alt: true }
      : { code: `Digit${digit}`, mod: true, shift: true };
  return [
    [
      "General",
      [
        {
          label: "Buscar una acción",
          combos: [SHORTCUTS.commandPalette, SHORTCUTS.commandPaletteAnywhere],
          note: "En el editor, la segunda",
        },
        { label: "Guardar ahora", combos: [SHORTCUTS.saveDocument] },
        { label: "Compilar el PDF", combos: [SHORTCUTS.compile] },
        { label: "Ver estos atajos", typed: "?", note: "Fuera del texto" },
      ],
    ],
    [
      "Paneles",
      [
        { label: "Markdown", combos: [togglePane.markdown] },
        { label: "LaTeX", combos: [togglePane.latex] },
        { label: "Vista previa", combos: [togglePane.preview] },
        { label: "Los tres a la vez", combos: [SHORTCUTS.showAllPanes] },
      ],
    ],
    [
      "Formato",
      [
        { label: "Negrita", combos: [format.bold] },
        { label: "Cursiva", combos: [format.italic] },
        { label: "Código en línea", combos: [format.inlineCode] },
        { label: "Enlace", combos: [format.link] },
        { label: "Título", combos: [heading(1)] },
        { label: "Sección", combos: [heading(2)] },
        { label: "Subsección", combos: [heading(3)] },
        { label: "Lista", combos: [format.bulletList] },
        { label: "Lista numerada", combos: [format.orderedList] },
        { label: "Cita en bloque", combos: [format.blockquote] },
      ],
    ],
    [
      "Editor",
      [
        { label: "Inserciones rápidas", typed: "/", note: "Al empezar una línea" },
        { label: "Citar una referencia", typed: "@", note: "Ofrece las claves" },
        // CodeMirror's own keys; on a Mac, Ctrl+Space switches the keyboard language.
        {
          label: "Sugerencias",
          combos: [isMac ? { code: "KeyI", alt: true } : { code: "Space", mod: true }],
        },
        { label: "Buscar y reemplazar", combos: [{ code: "KeyF", mod: true }] },
        { label: "Deshacer", combos: [{ code: "KeyZ", mod: true }] },
        {
          label: "Rehacer",
          combos: [
            isMac
              ? { code: "KeyZ", mod: true, shift: true }
              : { code: "KeyY", mod: true },
          ],
        },
      ],
    ],
  ];
}

/** Whether a key press is typing: in a text field or the editor, "?" is just text. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** Every keyboard shortcut, opened with "?" or from the command palette. */
export function ShortcutsDialog() {
  const [open, setOpen] = usePanel("shortcuts");
  const isMac = useIsMac();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="gap-1 border-b px-5 pt-4 pr-12 pb-3">
          <DialogTitle className="text-sm">Atajos de teclado</DialogTitle>
          <DialogDescription className="text-xs">
            {isMac
              ? "En Mac, ⌘ hace las veces de Ctrl."
              : "En Mac, usa ⌘ donde aquí pone Ctrl."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-x-10 gap-y-6 overflow-y-auto px-5 py-5 md:grid-cols-2">
          {sections(isMac).map(([title, rows]) => (
            <section key={title} aria-labelledby={`shortcuts-${title}`}>
              <h3
                id={`shortcuts-${title}`}
                className="mb-1.5 text-2xs font-medium text-faint-foreground"
              >
                {title}
              </h3>
              <dl className="divide-y divide-border">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex min-h-9 items-center justify-between gap-4 py-1.5"
                  >
                    <dt className="min-w-0 text-ui">
                      {row.label}
                      {row.note ? (
                        <span className="block text-2xs text-muted-foreground">
                          {row.note}
                        </span>
                      ) : null}
                    </dt>
                    <dd className="flex shrink-0 items-center gap-1.5">
                      {row.typed ? <Kbd>{row.typed}</Kbd> : null}
                      {row.combos?.map((combo, index) => (
                        <span
                          key={combo.code + index}
                          className="flex items-center gap-1.5"
                        >
                          {index > 0 ? (
                            <span className="text-2xs text-muted-foreground">o</span>
                          ) : null}
                          <ShortcutKeys combo={combo} />
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
