"use client";

import dynamic from "next/dynamic";

// KaTeX and the sanitizer are only needed in the browser, and only by this pane.
const PreviewWorkbench = dynamic(
  () => import("./preview-workbench").then((module) => module.PreviewWorkbench),
  { ssr: false },
);

/** The preview pane: the document as it will read, updated as it is written. */
export function PreviewPane() {
  return <PreviewWorkbench />;
}
