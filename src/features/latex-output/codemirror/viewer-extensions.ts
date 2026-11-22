import { selectAll } from "@codemirror/commands";
import { StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import { drawSelection, EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tagHighlighter, tags as t } from "@lezer/highlight";

import { spanishPhrases } from "@/lib/codemirror/phrases";
import { editorTheme } from "@/lib/codemirror/theme";

/** Maps the LaTeX tokenizer's tags to the shared `tok-*` classes. */
const latexHighlighter = tagHighlighter([
  { tag: t.tagName, class: "tok-command" },
  { tag: t.atom, class: "tok-atom" },
  { tag: t.bracket, class: "tok-punctuation" },
  { tag: t.comment, class: "tok-comment" },
  // Math delimiters and the variables between them.
  { tag: t.keyword, class: "tok-math" },
  { tag: t.special(t.variableName), class: "tok-math" },
  { tag: t.number, class: "tok-number" },
  { tag: t.string, class: "tok-string" },
  { tag: t.invalid, class: "tok-invalid" },
]);

/**
 * A read-only LaTeX view. It cannot be edited, but it can be focused, searched and
 * selected with the keyboard, so the code can be copied in part.
 */
export function latexViewerExtensions(): Extension {
  return [
    lineNumbers(),
    drawSelection(),
    highlightSelectionMatches(),
    search({ top: true }),
    EditorView.lineWrapping,
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorView.contentAttributes.of({
      tabindex: "0",
      "aria-label": "Código LaTeX generado",
      "aria-readonly": "true",
    }),
    StreamLanguage.define(stex),
    syntaxHighlighting(latexHighlighter),
    spanishPhrases,
    editorTheme,
    keymap.of([...searchKeymap, { key: "Mod-a", run: selectAll }]),
  ];
}
