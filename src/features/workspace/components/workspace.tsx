"use client";

import { useSplitView } from "../hooks/use-split-view";
import {
  WorkspaceLayoutProvider,
  useWorkspaceLayout,
} from "../hooks/use-workspace-layout";
import type { WorkspaceLayout } from "../model/layout";
import { Pane } from "./pane";
import { SplitView } from "./split-view";
import { TopBar } from "./top-bar";
import { WorkspaceShortcuts } from "./workspace-shortcuts";

function WorkspaceShell() {
  const splitView = useSplitView();
  const { layout } = useWorkspaceLayout();

  return (
    <div className="flex h-dvh flex-col">
      <WorkspaceShortcuts splitView={splitView} />
      <TopBar splitView={splitView} />
      <main className="min-h-0 flex-1 px-1.5 pb-1.5">
        {splitView ? <SplitView /> : <Pane pane={layout.active} withMenu={false} />}
      </main>
    </div>
  );
}

/** The editor workspace: top bar plus the Markdown, LaTeX and preview panes. */
export function Workspace({ initialLayout }: { initialLayout: WorkspaceLayout }) {
  return (
    <WorkspaceLayoutProvider initialLayout={initialLayout}>
      <WorkspaceShell />
    </WorkspaceLayoutProvider>
  );
}
