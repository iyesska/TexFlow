"use client";

import { Wordmark } from "@/components/brand/wordmark";

import { PaneSwitcher } from "./pane-switcher";
import { WorkspaceMenu } from "./workspace-menu";

export function TopBar({ splitView }: { splitView: boolean }) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 pt-2 pb-2 md:h-12 md:grid-cols-[1fr_auto_1fr] md:py-0">
      <Wordmark />
      <PaneSwitcher
        splitView={splitView}
        className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto"
      />
      <div className="col-start-2 row-start-1 flex justify-end md:col-start-3">
        <WorkspaceMenu />
      </div>
    </header>
  );
}
