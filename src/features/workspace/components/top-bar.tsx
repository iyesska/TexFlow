"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { Separator } from "@/components/ui/separator";
import { AccountMenu } from "@/features/account/components/account-menu";
import { BibliographyPanel } from "@/features/bibliography/components/bibliography-panel";
import { CommandButton } from "@/features/commands/components/command-button";
import type { AccountUser } from "@/features/account/model/account";
import { DocumentTitle } from "@/features/document/components/document-title";
import { useDocumentSession } from "@/features/document/hooks/use-document";
import { ExportMenu } from "@/features/export/components/export-menu";
import { HistoryPanel } from "@/features/history/components/history-panel";
import { FirstStepsGuide } from "@/features/onboarding/components/first-steps-guide";
import { DesignPanel } from "@/features/templates/components/design-panel";
import { SaveIndicator } from "@/features/document/components/save-indicator";

import { BackToLibrary } from "./back-to-library";
import { PaneSwitcher } from "./pane-switcher";
import { WorkspaceMenu } from "./workspace-menu";

export function TopBar({ splitView, user }: { splitView: boolean; user: AccountUser }) {
  const session = useDocumentSession();
  return (
    // Below xl the pane switcher takes a row of its own. From xl it sits in the
    // middle, and the actions never get less room than they need: at worst the
    // switcher moves off centre rather than under them.
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 pt-2 pb-2 xl:h-12 xl:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] xl:py-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <BackToLibrary />
        <Wordmark className="hidden shrink-0 sm:inline-flex" />
        <Separator orientation="vertical" className="hidden h-4! shrink-0 sm:block" />
        <DocumentTitle />
        <SaveIndicator />
      </div>
      <PaneSwitcher
        splitView={splitView}
        className="col-span-2 row-start-2 xl:col-span-1 xl:row-start-auto"
      />
      {/* Each button shows its label only from a width where there is room for it. */}
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 xl:col-start-3">
        <CommandButton />
        <FirstStepsGuide />
        <DesignPanel />
        <BibliographyPanel />
        <HistoryPanel />
        <ExportMenu />
        <WorkspaceMenu />
        <AccountMenu user={user} beforeSignOut={session.flush} />
      </div>
    </header>
  );
}
