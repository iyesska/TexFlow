"use client";

import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { authorsLabel, entryYear, plainText, scanBibtex } from "@/documents/bibtex";
import {
  useDocumentBibliography,
  useDocumentSession,
} from "@/features/document/hooks/use-document";
import { minimalChange } from "@/lib/text-diff";

import type { CursorPosition } from "../codemirror/extensions";
import { useImageInsertion } from "../hooks/use-image-insertion";
import { EditorStatusBar } from "./editor-status-bar";
import { EditorToolbar } from "./editor-toolbar";
import { MarkdownEditor } from "./markdown-editor";

/** The Markdown pane's content: toolbar, editor and status bar. */
export function MarkdownWorkbench() {
  const session = useDocumentSession();
  const [initialMarkdown] = useState(() => session.getSnapshot().markdown);
  const [view, setView] = useState<EditorView | null>(null);
  const [cursor, setCursor] = useState<CursorPosition | null>(null);
  const insertImages = useImageInsertion(view);
  const bibliography = useDocumentBibliography();
  const citations = useMemo(
    () =>
      scanBibtex(bibliography).entries.map((entry) => ({
        key: entry.key,
        label: [authorsLabel(entry), entryYear(entry) && `(${entryYear(entry)})`]
          .filter(Boolean)
          .join(" "),
        title: plainText(entry.fields.title ?? ""),
      })),
    [bibliography],
  );
  /** The last text the editor itself handed to the session. */
  const written = useRef(initialMarkdown);

  const write = useCallback(
    (markdown: string) => {
      written.current = markdown;
      session.setMarkdown(markdown);
    },
    [session],
  );

  // Text can also change from outside the editor: unsaved work taken back after a
  // reload, or a version restored from the history. The editor then shows it.
  useEffect(() => {
    if (!view) return;
    const follow = () => {
      const { markdown } = session.getSnapshot();
      if (markdown === written.current || markdown === view.state.doc.toString()) return;
      written.current = markdown;
      // Only the part that differs, so the cursor stays put when it is elsewhere.
      const change = minimalChange(view.state.doc.toString(), markdown);
      if (change) view.dispatch({ changes: change });
    };
    follow();
    return session.subscribe(follow);
  }, [session, view]);

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar view={view} onImagesPicked={(files) => void insertImages(files)} />
      <div className="min-h-0 flex-1">
        <MarkdownEditor
          initialMarkdown={initialMarkdown}
          onDocChange={write}
          onCursorChange={setCursor}
          onImageFiles={(files, position) => void insertImages(files, position)}
          onViewChange={setView}
          citations={() => citations}
        />
      </div>
      <EditorStatusBar cursor={cursor} />
    </div>
  );
}
