"use client";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { latexViewerExtensions } from "../codemirror/viewer-extensions";
import { minimalChange } from "../model/text-diff";

/** Shows LaTeX read-only, updating in place as new code arrives. */
export function LatexViewer({ latex }: { latex: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      state: EditorState.create({ extensions: latexViewerExtensions() }),
      parent: host,
    });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const change = minimalChange(view.state.doc.toString(), latex);
    if (change) view.dispatch({ changes: change });
  }, [latex]);

  return <div ref={hostRef} className="h-full min-h-0" />;
}
