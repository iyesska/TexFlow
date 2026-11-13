import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from "@codemirror/view";

import { slashCompletions, texCompletions } from "./completions";
import { formattingKeymap } from "./keymap";
import { markdownSupport } from "./language";
import { spanishPhrases } from "@/lib/codemirror/phrases";
import { editorTheme } from "@/lib/codemirror/theme";

export interface CursorPosition {
  readonly line: number;
  readonly column: number;
  /** Number of selected characters; 0 for a plain cursor. */
  readonly selected: number;
}

export interface EditorListeners {
  onDocChange(markdown: string): void;
  onCursorChange(cursor: CursorPosition): void;
  /**
   * Image files were pasted or dropped. `position` is where they were dropped, or
   * null to use the cursor.
   */
  onImageFiles(files: File[], position: number | null): void;
}

function imageFiles(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []).filter((file) => file.type.startsWith("image/"));
}

export function cursorPosition(state: EditorState): CursorPosition {
  const { head, from, to } = state.selection.main;
  const line = state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1, selected: to - from };
}

/** Everything the Markdown editor is made of, in one extension. */
export function markdownEditorExtensions(listeners: EditorListeners): Extension {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    indentUnit.of("    "),
    bracketMatching(),
    closeBrackets(),
    // Strict filtering: "/ta" offers /tabla and /tareas, not every label containing t and a.
    autocompletion({ icons: false, filterStrict: true }),
    highlightSelectionMatches(),
    search({ top: true }),
    EditorView.lineWrapping,
    EditorState.allowMultipleSelections.of(true),

    markdownSupport(),
    markdownLanguage.data.of({ autocomplete: slashCompletions }),
    markdownLanguage.data.of({ autocomplete: texCompletions }),
    // "$" is deliberately not auto-closed: a stray closing dollar after a price such
    // as "$5" would silently turn the rest of the sentence into a formula.
    markdownLanguage.data.of({
      closeBrackets: { brackets: ["(", "[", "{", '"', "`"] },
    }),

    placeholder("Escribe en Markdown. Prueba «/» para insertar una tabla o una fórmula."),
    spanishPhrases,
    editorTheme,
    EditorView.contentAttributes.of({
      "aria-label": "Editor Markdown",
      spellcheck: "true",
    }),

    Prec.high(keymap.of(formattingKeymap)),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),

    // Pasted or dropped images are added to the document instead of being ignored.
    EditorView.domEventHandlers({
      paste(event) {
        const files = imageFiles(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        listeners.onImageFiles(files, null);
        return true;
      },
      drop(event, view) {
        const files = imageFiles(event.dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
        listeners.onImageFiles(files, position);
        return true;
      },
    }),

    EditorView.updateListener.of((update) => {
      if (update.docChanged) listeners.onDocChange(update.state.doc.toString());
      if (update.docChanged || update.selectionSet) {
        listeners.onCursorChange(cursorPosition(update.state));
      }
    }),
  ];
}
