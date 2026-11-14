"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { Separator } from "@/components/ui/separator";
import { AccountMenu } from "@/features/account/components/account-menu";
import type { AccountUser } from "@/features/account/model/account";
import { DocumentTitle } from "@/features/document/components/document-title";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { ExportMenu } from "@/features/export/components/export-menu";
import { DesignPanel } from "@/features/templates/components/design-panel";
import { SaveIndicator } from "@/features/document/components/save-indicator";

import { BackToLibrary } from "./back-to-library";
import { PaneSwitcher } from "./pane-switcher";
import { WorkspaceMenu } from "./workspace-menu";

export function TopBar({ splitView, user }: { splitView: boolean; user: AccountUser }) {
  const session = useDocumentSession();
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 pt-2 pb-2 md:h-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:py-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <BackToLibrary />
        <Wordmark className="hidden shrink-0 sm:inline-flex" />
        <Separator orientation="vertical" className="hidden h-4! shrink-0 sm:block" />
        <DocumentTitle />
        <SaveIndicator />
      </div>
      <PaneSwitcher
        splitView={splitView}
        className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto"
      />
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 md:col-start-3">
        <DesignPanel />
        <ExportMenu />
        <WorkspaceMenu />
        <AccountMenu user={user} beforeSignOut={session.flush} />
      </div>
    </header>
  );
}
