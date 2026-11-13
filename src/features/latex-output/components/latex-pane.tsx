"use client";

import dynamic from "next/dynamic";

// The viewer is CodeMirror, which only runs in the browser.
const LatexWorkbench = dynamic(
  () => import("./latex-workbench").then((module) => module.LatexWorkbench),
  { ssr: false },
);

/** The LaTeX pane: the code Pandoc generates from the Markdown, kept up to date. */
export function LatexPane() {
  return <LatexWorkbench />;
}
