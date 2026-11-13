import type { KeyCombo } from "@/lib/keyboard";
import type { PaneId } from "@/features/workspace/model/layout";

type ShortcutMap = { readonly [name: string]: KeyCombo | ShortcutMap };

/**
 * Every keyboard shortcut in the product, in one place.
 *
 * Pane shortcuts use Alt because browsers reserve Ctrl/Command + digit for tab switching.
 * Headings are bound in the editor keymap instead: no single combination is free on
 * every platform, so they differ between macOS and the rest.
 */
export const SHORTCUTS = {
  togglePane: {
    markdown: { code: "Digit1", alt: true },
    latex: { code: "Digit2", alt: true },
    preview: { code: "Digit3", alt: true },
  } satisfies Record<PaneId, KeyCombo>,
  showAllPanes: { code: "Digit0", alt: true },
  saveDocument: { code: "KeyS", mod: true },
  compile: { code: "Enter", mod: true },
  format: {
    bold: { code: "KeyB", mod: true },
    italic: { code: "KeyI", mod: true },
    inlineCode: { code: "KeyE", mod: true },
    link: { code: "KeyK", mod: true },
    orderedList: { code: "Digit7", mod: true, shift: true },
    bulletList: { code: "Digit8", mod: true, shift: true },
    blockquote: { code: "Digit9", mod: true, shift: true },
  },
} as const satisfies ShortcutMap;
