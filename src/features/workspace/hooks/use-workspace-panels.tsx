"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The workspace's panels and dialogs that more than one control opens: their own
 * button, the command palette, the first-steps guide.
 */
export type WorkspacePanel =
  "design" | "references" | "history" | "commands" | "shortcuts" | "guide";

interface PanelsContextValue {
  readonly open: ReadonlySet<WorkspacePanel>;
  setOpen(panel: WorkspacePanel, open: boolean): void;
}

const PanelsContext = createContext<PanelsContextValue | null>(null);

export function WorkspacePanelsProvider({ children }: { children: ReactNode }) {
  const [open, setOpenPanels] = useState<ReadonlySet<WorkspacePanel>>(new Set());

  const setOpen = useCallback((panel: WorkspacePanel, isOpen: boolean) => {
    setOpenPanels((current) => {
      if (current.has(panel) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) next.add(panel);
      else next.delete(panel);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return <PanelsContext value={value}>{children}</PanelsContext>;
}

function usePanels(): PanelsContextValue {
  const context = use(PanelsContext);
  if (!context) {
    throw new Error("Workspace panels must be used inside <WorkspacePanelsProvider>.");
  }
  return context;
}

/** Whether a panel is open, and the way to open or close it: a dialog's own state. */
export function usePanel(
  panel: WorkspacePanel,
): readonly [boolean, (open: boolean) => void] {
  const { open, setOpen } = usePanels();
  const change = useCallback(
    (isOpen: boolean) => setOpen(panel, isOpen),
    [panel, setOpen],
  );
  return [open.has(panel), change];
}

/** Opens any of the panels, as the command palette does. */
export function useOpenPanel(): (panel: WorkspacePanel) => void {
  const { setOpen } = usePanels();
  return useCallback((panel: WorkspacePanel) => setOpen(panel, true), [setOpen]);
}
