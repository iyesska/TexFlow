"use client";

import { EditorView } from "@codemirror/view";
import { useEffect, useEffectEvent, useRef } from "react";

import { cursorPosition, type CursorPosition } from "../codemirror/extensions";
import { useEditorSessionCache } from "../hooks/use-editor-session-cache";

interface MarkdownEditorProps {
  /** The document when the editor mounts. Later edits come from the editor itself. */
  readonly initialMarkdown: string;
  readonly onDocChange: (markdown: string) => void;
  readonly onCursorChange: (cursor: CursorPosition) => void;
  readonly onImageFiles: (files: File[], position: number | null) => void;
  /** Receives the view once it exists, and `null` when it is destroyed. */
  readonly onViewChange: (view: EditorView | null) => void;
}

/** The CodeMirror view. Owns no document state of its own beyond the editor's. */
export function MarkdownEditor({
  initialMarkdown,
  onDocChange,
  onCursorChange,
  onImageFiles,
  onViewChange,
}: MarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cache = useEditorSessionCache();

  const handleDocChange = useEffectEvent(onDocChange);
  const handleCursorChange = useEffectEvent(onCursorChange);
  const handleImageFiles = useEffectEvent(onImageFiles);
  const handleViewChange = useEffectEvent(onViewChange);
  const initialState = useEffectEvent(() => cache.stateFor(initialMarkdown));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const disconnect = cache.connect({
      onDocChange: handleDocChange,
      onCursorChange: handleCursorChange,
      onImageFiles: handleImageFiles,
    });
    const view = new EditorView({ state: initialState(), parent: host });
    handleCursorChange(cursorPosition(view.state));
    handleViewChange(view);

    return () => {
      cache.remember(view.state);
      handleViewChange(null);
      disconnect();
      view.destroy();
    };
  }, [cache]);

  return <div ref={hostRef} className="h-full min-h-0" />;
}
