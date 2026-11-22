"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useWorkspaceLayout } from "@/features/workspace/hooks/use-workspace-layout";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { useCompilation } from "../hooks/use-compilation";

/** Ctrl/Cmd+Enter compiles the document and shows the PDF. */
export function CompilationShortcuts() {
  const compilation = useCompilation();
  const { dispatch } = useWorkspaceLayout();

  useKeyboardShortcuts([
    {
      combo: SHORTCUTS.compile,
      run: () => {
        dispatch({ type: "activate", pane: "preview" });
        compilation.setMode("pdf");
        void compilation.compile();
      },
    },
  ]);
  return null;
}
