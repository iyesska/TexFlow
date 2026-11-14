"use client";

import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDocumentSession } from "@/features/document/hooks/use-document";

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
  // reload, for one. The editor then shows it.
  useEffect(() => {
    if (!view) return;
    const follow = () => {
      const { markdown } = session.getSnapshot();
      if (markdown === written.current || markdown === view.state.doc.toString()) return;
      written.current = markdown;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: markdown },
      });
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
        />
      </div>
      <EditorStatusBar cursor={cursor} />
    </div>
  );
}
