"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { Separator } from "@/components/ui/separator";
import { DocumentTitle } from "@/features/document/components/document-title";
import { ExportMenu } from "@/features/export/components/export-menu";
import { SaveIndicator } from "@/features/document/components/save-indicator";

import { PaneSwitcher } from "./pane-switcher";
import { WorkspaceMenu } from "./workspace-menu";

export function TopBar({ splitView }: { splitView: boolean }) {
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 pt-2 pb-2 md:h-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:py-0">
      <div className="flex min-w-0 items-center gap-3">
        <Wordmark className="shrink-0" />
        <Separator orientation="vertical" className="h-4! shrink-0" />
        <DocumentTitle />
        <SaveIndicator />
      </div>
      <PaneSwitcher
        splitView={splitView}
        className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto"
      />
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 md:col-start-3">
        <ExportMenu />
        <WorkspaceMenu />
      </div>
    </header>
  );
}
