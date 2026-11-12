import type { KeyBinding } from "@codemirror/view";

import { SHORTCUTS } from "@/config/shortcuts";
import { codeMirrorKey } from "@/lib/keyboard";

import {
  insertLink,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleInlineCode,
  toggleItalic,
  toggleOrderedList,
} from "./commands";

const { format } = SHORTCUTS;

/**
 * Headings: Ctrl+Alt+digit types characters on Windows keyboards with AltGr, and
 * Cmd+Shift+digit takes screenshots on macOS, so each platform gets the free one.
 */
const headingBindings: KeyBinding[] = ([1, 2, 3] as const).map((level) => ({
  key: `Ctrl-Shift-${level}`,
  mac: `Cmd-Alt-${level}`,
  run: toggleHeading(level),
}));

export const formattingKeymap: readonly KeyBinding[] = [
  { key: codeMirrorKey(format.bold), run: toggleBold },
  { key: codeMirrorKey(format.italic), run: toggleItalic },
  { key: codeMirrorKey(format.inlineCode), run: toggleInlineCode },
  { key: codeMirrorKey(format.link), run: insertLink },
  { key: codeMirrorKey(format.orderedList), run: toggleOrderedList },
  { key: codeMirrorKey(format.bulletList), run: toggleBulletList },
  { key: codeMirrorKey(format.blockquote), run: toggleBlockquote },
  ...headingBindings,
];
