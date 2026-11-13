"use client";

import type { EditorView } from "@codemirror/view";
import { useState } from "react";

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

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar view={view} onImagesPicked={(files) => void insertImages(files)} />
      <div className="min-h-0 flex-1">
        <MarkdownEditor
          initialMarkdown={initialMarkdown}
          onDocChange={session.setMarkdown}
          onCursorChange={setCursor}
          onImageFiles={(files, position) => void insertImages(files, position)}
          onViewChange={setView}
        />
      </div>
      <EditorStatusBar cursor={cursor} />
    </div>
  );
}
