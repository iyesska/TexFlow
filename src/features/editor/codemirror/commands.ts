import { snippet } from "@codemirror/autocomplete";
import {
  EditorSelection,
  type ChangeSpec,
  type EditorState,
  type Line,
  type StateCommand,
} from "@codemirror/state";

/** Formatting commands. Each works on the editor state alone, so it can be tested. */

const FORMAT_EVENT = "input.format";

/** Wraps each selection in `marker`, or removes the marker when it is already there. */
function toggleWrap(marker: string, placeholder: string): StateCommand {
  const size = marker.length;
  return ({ state, dispatch }) => {
    const transaction = state.changeByRange((range) => {
      const text = state.sliceDoc(range.from, range.to);
      const before = state.sliceDoc(range.from - size, range.from);
      const after = state.sliceDoc(range.to, range.to + size);

      if (before === marker && after === marker) {
        return {
          changes: [
            { from: range.from - size, to: range.from },
            { from: range.to, to: range.to + size },
          ],
          range: EditorSelection.range(range.from - size, range.to - size),
        };
      }
      if (text.length > size * 2 && text.startsWith(marker) && text.endsWith(marker)) {
        return {
          changes: { from: range.from, to: range.to, insert: text.slice(size, -size) },
          range: EditorSelection.range(range.from, range.to - size * 2),
        };
      }
      const content = text || placeholder;
      return {
        changes: { from: range.from, to: range.to, insert: marker + content + marker },
        range: EditorSelection.range(
          range.from + size,
          range.from + size + content.length,
        ),
      };
    });
    dispatch(
      state.update(transaction, { scrollIntoView: true, userEvent: FORMAT_EVENT }),
    );
    return true;
  };
}

export const toggleBold = toggleWrap("**", "texto en negrita");
// Underscores keep italics from being confused with the asterisks of bold text.
export const toggleItalic = toggleWrap("_", "texto en cursiva");
export const toggleInlineCode = toggleWrap("`", "código");
export const toggleInlineMath = toggleWrap("$", "x^2");

function selectedLines(state: EditorState): Line[] {
  const lines = new Map<number, Line>();
  for (const range of state.selection.ranges) {
    const last = state.doc.lineAt(range.to).number;
    for (let number = state.doc.lineAt(range.from).number; number <= last; number++) {
      lines.set(number, state.doc.line(number));
    }
  }
  return [...lines.values()];
}

function replaceLinePrefixes(
  state: EditorState,
  lines: readonly Line[],
  prefixPattern: RegExp,
  nextPrefix: (current: string, index: number) => string,
) {
  const specs: ChangeSpec[] = lines.map((line, index) => {
    const current = prefixPattern.exec(line.text)?.[0] ?? "";
    return {
      from: line.from,
      to: line.from + current.length,
      insert: nextPrefix(current, index),
    };
  });
  const changes = state.changes(specs);
  return state.update({
    changes,
    // A cursor sitting where a prefix is inserted ends up after it, ready to type.
    selection: state.selection.map(changes, 1),
    scrollIntoView: true,
    userEvent: FORMAT_EVENT,
  });
}

const HEADING_PREFIX = /^#{1,6}\s+/;

/** Turns the selected lines into headings of `level`, or back into text. */
export function toggleHeading(level: 1 | 2 | 3): StateCommand {
  const prefix = `${"#".repeat(level)} `;
  return ({ state, dispatch }) => {
    const lines = selectedLines(state);
    const allAtLevel = lines.every((line) => line.text.startsWith(prefix));
    dispatch(
      replaceLinePrefixes(state, lines, HEADING_PREFIX, () => (allAtLevel ? "" : prefix)),
    );
    return true;
  };
}

/** Any block marker a line can start with: bullet, number or quote. */
const BLOCK_PREFIX = /^(\s*)(?:[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|>\s?)/;

function toggleLinePrefix(
  isActive: (text: string) => boolean,
  prefixFor: (index: number) => string,
): StateCommand {
  return ({ state, dispatch }) => {
    const selected = selectedLines(state);
    // Blank lines inside a selection are left alone, unless there is nothing else.
    const withText = selected.filter((line) => line.text.trim() !== "");
    const lines = withText.length > 0 ? withText : selected;
    const allActive = lines.every((line) => isActive(line.text));
    dispatch(
      replaceLinePrefixes(state, lines, BLOCK_PREFIX, (current, index) => {
        const indent = /^\s*/.exec(current)?.[0] ?? "";
        return allActive ? indent : indent + prefixFor(index);
      }),
    );
    return true;
  };
}

export const toggleBulletList = toggleLinePrefix(
  (text) => /^\s*[-*+]\s+/.test(text),
  () => "- ",
);
export const toggleOrderedList = toggleLinePrefix(
  (text) => /^\s*\d+[.)]\s+/.test(text),
  (index) => `${index + 1}. `,
);
export const toggleBlockquote = toggleLinePrefix(
  (text) => /^\s*>/.test(text),
  () => "> ",
);

/** Wraps the selection in a link, leaving the cursor on the URL. */
export const insertLink: StateCommand = ({ state, dispatch }) => {
  const url = "https://";
  const transaction = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || "texto del enlace";
    const urlStart = range.from + text.length + 3;
    return {
      changes: { from: range.from, to: range.to, insert: `[${text}](${url})` },
      range: EditorSelection.range(urlStart, urlStart + url.length),
    };
  });
  dispatch(state.update(transaction, { scrollIntoView: true, userEvent: FORMAT_EVENT }));
  return true;
};

/**
 * Templates for block-level insertions. `${...}` marks a field the user tabs through.
 * They are shared by the toolbar and by the slash completions.
 */
export const BLOCK_TEMPLATES = {
  codeBlock: "```${lenguaje}\n${código}\n```",
  mathBlock: "$$\n${fórmula}\n$$",
  table:
    "| ${Columna 1} | ${Columna 2} |\n| --- | --- |\n| ${Celda} | ${Celda} |\n| ${Celda} | ${Celda} |",
  image: "![${Descripción de la imagen}](${ruta/imagen.png})",
  footnote: "[^${nota}]: ${Texto de la nota}",
} as const;

/** Inserts a block template on its own paragraph, after the current line if needed. */
export function insertBlock(template: string): StateCommand {
  return ({ state, dispatch }) => {
    const line = state.doc.lineAt(state.selection.main.head);
    const isBlank = line.text.trim() === "";
    const at = isBlank ? line.from : line.to;
    const lead = isBlank ? "" : "\n\n";
    snippet(lead + template)({ state, dispatch }, null, at, isBlank ? line.to : at);
    return true;
  };
}
