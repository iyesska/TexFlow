"use client";

import { useEffect, useEffectEvent } from "react";

import { matchesCombo, type KeyCombo } from "@/lib/keyboard";

export interface ShortcutBinding {
  readonly combo: KeyCombo;
  readonly run: () => void;
}

/** Runs the first binding whose combo matches a keydown anywhere in the window. */
export function useKeyboardShortcuts(bindings: readonly ShortcutBinding[]): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat) return;
    const binding = bindings.find(({ combo }) => matchesCombo(event, combo));
    if (!binding) return;
    event.preventDefault();
    binding.run();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
