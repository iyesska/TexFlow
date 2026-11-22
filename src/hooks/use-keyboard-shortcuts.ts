"use client";

import { useEffect, useEffectEvent } from "react";

import { matchesCombo, type KeyCombo } from "@/lib/keyboard";

export interface ShortcutBinding {
  readonly combo: KeyCombo;
  readonly run: () => void;
  /**
   * Leaves the key to whatever on the page already acted on it, such as the editor's
   * own binding for the same combination.
   */
  readonly unlessHandled?: boolean;
}

/** Runs the first binding whose combo matches a keydown anywhere in the window. */
export function useKeyboardShortcuts(bindings: readonly ShortcutBinding[]): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat) return;
    const binding = bindings.find(
      ({ combo, unlessHandled }) =>
        matchesCombo(event, combo) && !(unlessHandled && event.defaultPrevented),
    );
    if (!binding) return;
    event.preventDefault();
    binding.run();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
