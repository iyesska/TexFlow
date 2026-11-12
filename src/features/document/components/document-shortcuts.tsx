"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { useDocumentSession } from "../hooks/use-document";

/** Saves on Ctrl/Cmd+S instead of opening the browser's "save page" dialog. */
export function DocumentShortcuts() {
  const session = useDocumentSession();
  useKeyboardShortcuts([
    { combo: SHORTCUTS.saveDocument, run: () => void session.flush() },
  ]);
  return null;
}
