import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { markdownEditorExtensions, type EditorListeners } from "./extensions";

/**
 * Keeps the editor's state (text, cursor, undo history) while the editor itself is
 * unmounted, for example when its pane is hidden, and routes editor events to
 * whichever component is currently showing it.
 */
export interface EditorSessionCache {
  /** The state to mount with: the remembered one if it still matches the document. */
  stateFor(markdown: string): EditorState;
  remember(state: EditorState): void;
  /** Starts sending editor events to `listeners`. Returns a function that stops it. */
  connect(listeners: EditorListeners): () => void;
  /** Registers the mounted editor view. Returns a function that unregisters it. */
  attach(view: EditorView): () => void;
  /**
   * Moves the cursor to a line (1-based) and scrolls it into view. If the editor is
   * not on screen yet, it happens as soon as it is.
   */
  revealLine(line: number): void;
}

function reveal(view: EditorView, line: number): void {
  const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
  view.dispatch({
    selection: { anchor: target.from },
    effects: EditorView.scrollIntoView(target.from, { y: "center" }),
  });
  view.focus();
}

export function createEditorSessionCache(): EditorSessionCache {
  let remembered: EditorState | null = null;
  let connected: EditorListeners | null = null;
  let attached: EditorView | null = null;
  let pendingLine: number | null = null;

  // The extensions outlive any one component, so they call through this relay.
  const relay: EditorListeners = {
    onDocChange: (markdown) => connected?.onDocChange(markdown),
    onCursorChange: (cursor) => connected?.onCursorChange(cursor),
    onImageFiles: (files, position) => connected?.onImageFiles(files, position),
  };

  return {
    stateFor(markdown) {
      if (remembered && remembered.doc.toString() === markdown) return remembered;
      return EditorState.create({
        doc: markdown,
        extensions: markdownEditorExtensions(relay),
      });
    },
    remember(state) {
      remembered = state;
    },
    attach(view) {
      attached = view;
      if (pendingLine !== null) {
        reveal(view, pendingLine);
        pendingLine = null;
      }
      return () => {
        if (attached === view) attached = null;
      };
    },
    revealLine(line) {
      if (attached) reveal(attached, line);
      else pendingLine = line;
    },
    connect(listeners) {
      connected = listeners;
      return () => {
        if (connected === listeners) connected = null;
      };
    },
  };
}
