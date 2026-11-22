"use client";

import { useDeferredValue, useMemo } from "react";

import { useDocumentMarkdown } from "@/features/document/hooks/use-document";
import { countWords } from "@/features/document/model/document";

import type { CursorPosition } from "../codemirror/extensions";

const wordFormat = new Intl.NumberFormat("es");

function wordsLabel(count: number): string {
  return `${wordFormat.format(count)} ${count === 1 ? "palabra" : "palabras"}`;
}

function selectionLabel(selected: number): string {
  return selected === 1
    ? "1 seleccionado"
    : `${wordFormat.format(selected)} seleccionados`;
}

/** Cursor position and document size, at the foot of the editor. */
export function EditorStatusBar({ cursor }: { cursor: CursorPosition | null }) {
  // Counting words can wait for a pause in typing.
  const markdown = useDeferredValue(useDocumentMarkdown());
  const words = useMemo(() => countWords(markdown), [markdown]);

  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-muted-foreground tabular-nums">
      {cursor ? (
        <span>
          Línea {cursor.line}, columna {cursor.column}
        </span>
      ) : null}
      {cursor && cursor.selected > 0 ? (
        <span>{selectionLabel(cursor.selected)}</span>
      ) : null}
      <span className="ml-auto">{wordsLabel(words)}</span>
    </div>
  );
}
