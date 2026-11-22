"use client";

import { Fragment } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { useWorkspaceLayout } from "../hooks/use-workspace-layout";
import { MIN_PANE_PERCENT, isPaneId, paneShares, type PaneId } from "../model/layout";
import { Pane } from "./pane";

function paneSizes(
  sizes: Readonly<Record<string, number>>,
): Partial<Record<PaneId, number>> {
  const result: Partial<Record<PaneId, number>> = {};
  for (const [id, size] of Object.entries(sizes)) {
    if (isPaneId(id)) result[id] = size;
  }
  return result;
}

/** The visible panes side by side, separated by draggable handles. */
export function SplitView() {
  const { layout, dispatch } = useWorkspaceLayout();
  const shares = paneShares(layout);

  return (
    <ResizablePanelGroup
      id="workspace-split"
      orientation="horizontal"
      defaultLayout={shares}
      onLayoutChanged={(sizes) => dispatch({ type: "resize", sizes: paneSizes(sizes) })}
    >
      {layout.visible.map((pane, index) => (
        <Fragment key={pane}>
          {index > 0 ? <ResizableHandle /> : null}
          <ResizablePanel
            id={pane}
            minSize={`${MIN_PANE_PERCENT}%`}
            defaultSize={`${shares[pane]}%`}
          >
            <Pane pane={pane} withMenu />
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
