"use client";

import type { AssetDto, DocumentDto } from "@/contracts/documents";
import type { AccountUser } from "@/features/account/model/account";
import { AssetLibraryProvider } from "@/features/assets/hooks/use-assets";
import { CommandPalette } from "@/features/commands/components/command-palette";
import { ShortcutsDialog } from "@/features/commands/components/shortcuts-dialog";
import { CompilationShortcuts } from "@/features/compilation/components/compilation-shortcuts";
import { CompilationProvider } from "@/features/compilation/hooks/use-compilation";
import { DocumentShortcuts } from "@/features/document/components/document-shortcuts";
import { DocumentProvider } from "@/features/document/hooks/use-document";
import { EditorSessionCacheProvider } from "@/features/editor/hooks/use-editor-session-cache";
import {
  FirstStepsProvider,
  FirstStepsTracker,
} from "@/features/onboarding/hooks/use-first-steps";

import { useSplitView } from "../hooks/use-split-view";
import {
  WorkspaceLayoutProvider,
  useWorkspaceLayout,
} from "../hooks/use-workspace-layout";
import { WorkspacePanelsProvider } from "../hooks/use-workspace-panels";
import type { WorkspaceLayout } from "../model/layout";
import { Pane } from "./pane";
import { SplitView } from "./split-view";
import { TopBar } from "./top-bar";
import { WorkspaceShortcuts } from "./workspace-shortcuts";

function WorkspaceShell({ user }: { user: AccountUser }) {
  const splitView = useSplitView();
  const { layout } = useWorkspaceLayout();

  return (
    <div className="flex h-dvh flex-col">
      <WorkspaceShortcuts splitView={splitView} />
      <DocumentShortcuts />
      <CompilationShortcuts />
      <FirstStepsTracker />
      <CommandPalette splitView={splitView} />
      <ShortcutsDialog />
      <TopBar splitView={splitView} user={user} />
      <main className="min-h-0 flex-1 px-1.5 pb-1.5">
        {splitView ? <SplitView /> : <Pane pane={layout.active} withMenu={false} />}
      </main>
    </div>
  );
}

interface WorkspaceProps {
  readonly document: DocumentDto;
  readonly assets: readonly AssetDto[];
  readonly user: AccountUser;
  readonly initialLayout: WorkspaceLayout;
}

/** The editor workspace for one document: top bar plus the three panes. */
export function Workspace({ document, assets, user, initialLayout }: WorkspaceProps) {
  return (
    <WorkspaceLayoutProvider initialLayout={initialLayout}>
      <DocumentProvider document={document}>
        <AssetLibraryProvider documentId={document.id} assets={assets}>
          <CompilationProvider>
            <EditorSessionCacheProvider>
              <WorkspacePanelsProvider>
                <FirstStepsProvider userId={user.id}>
                  <WorkspaceShell user={user} />
                </FirstStepsProvider>
              </WorkspacePanelsProvider>
            </EditorSessionCacheProvider>
          </CompilationProvider>
        </AssetLibraryProvider>
      </DocumentProvider>
    </WorkspaceLayoutProvider>
  );
}
