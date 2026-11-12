"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";
import { PANE_IDS } from "../model/layout";

/** Binds the workspace-wide keyboard shortcuts. Renders nothing. */
export function WorkspaceShortcuts({ splitView }: { splitView: boolean }) {
  const { dispatch } = useWorkspaceLayout();

  useKeyboardShortcuts([
    ...PANE_IDS.map((pane) => ({
      combo: SHORTCUTS.togglePane[pane],
      run: () =>
        dispatch(splitView ? { type: "toggle", pane } : { type: "activate", pane }),
    })),
    { combo: SHORTCUTS.showAllPanes, run: () => dispatch({ type: "showAll" }) },
  ]);

  return null;
}
