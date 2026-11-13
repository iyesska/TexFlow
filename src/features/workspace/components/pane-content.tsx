import type { ComponentType } from "react";

import { MarkdownPane } from "@/features/editor/components/markdown-pane";
import { LatexPane } from "@/features/latex-output/components/latex-pane";
import { PreviewPane } from "@/features/preview/components/preview-pane";

import type { PaneId } from "../model/layout";

const CONTENTS: Readonly<Record<PaneId, ComponentType>> = {
  markdown: MarkdownPane,
  latex: LatexPane,
  preview: PreviewPane,
};

/** What each pane shows. */
export function PaneContent({ pane }: { pane: PaneId }) {
  const Content = CONTENTS[pane];
  return <Content />;
}
