"use client";

import { useId } from "react";

import type { PaneId } from "../model/layout";
import { PaneContent } from "./pane-content";
import { PaneFrame } from "./pane-frame";
import { PaneMenu } from "./pane-menu";
import { PANE_META } from "./pane-meta";

interface PaneProps {
  readonly pane: PaneId;
  /** Split-view panes can be moved and hidden; a lone pane on a narrow screen cannot. */
  readonly withMenu: boolean;
  readonly className?: string;
}

export function Pane({ pane, withMenu, className }: PaneProps) {
  const titleId = useId();
  const { label, icon: Icon } = PANE_META[pane];

  return (
    <PaneFrame
      labelledBy={titleId}
      className={className}
      header={
        <>
          <Icon className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
          <h2 id={titleId} className="truncate font-medium">
            {label}
          </h2>
        </>
      }
      actions={withMenu ? <PaneMenu pane={pane} /> : undefined}
    >
      <PaneContent pane={pane} />
    </PaneFrame>
  );
}
