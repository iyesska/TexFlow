import { EditorState } from "@codemirror/state";

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
}

export function createEditorSessionCache(): EditorSessionCache {
  let remembered: EditorState | null = null;
  let connected: EditorListeners | null = null;

  // The extensions outlive any one component, so they call through this relay.
  const relay: EditorListeners = {
    onDocChange: (markdown) => connected?.onDocChange(markdown),
    onCursorChange: (cursor) => connected?.onCursorChange(cursor),
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
    connect(listeners) {
      connected = listeners;
      return () => {
        if (connected === listeners) connected = null;
      };
    },
  };
}
