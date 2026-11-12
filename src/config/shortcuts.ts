import type { KeyCombo } from "@/lib/keyboard";
import type { PaneId } from "@/features/workspace/model/layout";

/**
 * Every keyboard shortcut in the product, in one place.
 *
 * Pane shortcuts use Alt because browsers reserve Ctrl/Command + digit for tab switching.
 */
export const SHORTCUTS = {
  togglePane: {
    markdown: { code: "Digit1", alt: true },
    latex: { code: "Digit2", alt: true },
    preview: { code: "Digit3", alt: true },
  } satisfies Record<PaneId, KeyCombo>,
  showAllPanes: { code: "Digit0", alt: true },
} as const;
