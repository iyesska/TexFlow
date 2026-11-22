import { EditorState, type StateCommand } from "@codemirror/state";
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
  /**
   * Inserts `text` at the cursor of the editor on screen, after a space when it would
   * otherwise touch a word, and gives the editor the keyboard. False when the editor
   * is not on screen.
   */
  insertAtCursor(text: string): boolean;
  /** Gives the editor on screen the keyboard. False when it is not on screen. */
  focus(): boolean;
  /**
   * Runs an editing command in the editor and gives it the keyboard. If the editor is
   * not on screen yet, it runs as soon as it is.
   */
  run(command: StateCommand): void;
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
  let pendingCommand: StateCommand | null = null;

  const runIn = (view: EditorView, command: StateCommand) => {
    command({ state: view.state, dispatch: view.dispatch });
    view.focus();
  };

  // The extensions outlive any one component, so they call through this relay.
  const relay: EditorListeners = {
    onDocChange: (markdown) => connected?.onDocChange(markdown),
    onCursorChange: (cursor) => connected?.onCursorChange(cursor),
    onImageFiles: (files, position) => connected?.onImageFiles(files, position),
    citations: () => connected?.citations() ?? [],
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
      if (pendingCommand) {
        runIn(view, pendingCommand);
        pendingCommand = null;
      }
      return () => {
        if (attached === view) attached = null;
      };
    },
    revealLine(line) {
      if (attached) reveal(attached, line);
      else pendingLine = line;
    },
    insertAtCursor(text) {
      const view = attached;
      if (!view) return false;
      const { from } = view.state.selection.main;
      const before = view.state.sliceDoc(Math.max(0, from - 1), from);
      const insert = before && /[\p{L}\p{N}.,;:)]/u.test(before) ? ` ${text}` : text;
      view.dispatch(view.state.replaceSelection(insert), { scrollIntoView: true });
      view.focus();
      return true;
    },
    run(command) {
      if (attached) runIn(attached, command);
      else pendingCommand = command;
    },
    focus() {
      if (!attached) return false;
      attached.focus();
      return true;
    },
    connect(listeners) {
      connected = listeners;
      return () => {
        if (connected === listeners) connected = null;
      };
    },
  };
}
