"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { useSaveStatus } from "@/features/document/hooks/use-document";

const LINE_WIDTHS = [
  "w-2/5",
  "w-4/5",
  "w-3/5",
  "w-0",
  "w-1/3",
  "w-11/12",
  "w-3/4",
  "w-1/2",
];

function EditorSkeleton() {
  return (
    <div
      className="flex h-full flex-col"
      aria-busy="true"
      aria-label="Cargando el editor"
    >
      <div className="h-9 shrink-0 border-b" />
      <div className="flex-1 space-y-3.5 px-12 py-5">
        {LINE_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-3 ${width}`} />
        ))}
      </div>
      <div className="h-7 shrink-0 border-t" />
    </div>
  );
}

// CodeMirror only runs in the browser and is the heaviest part of the page.
const MarkdownWorkbench = dynamic(
  () => import("./markdown-workbench").then((module) => module.MarkdownWorkbench),
  { ssr: false, loading: EditorSkeleton },
);

/** The Markdown pane: the editor, once the document has been read from storage. */
export function MarkdownPane() {
  const status = useSaveStatus();
  return status === "loading" ? <EditorSkeleton /> : <MarkdownWorkbench />;
}
