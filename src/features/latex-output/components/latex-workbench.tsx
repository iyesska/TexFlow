"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useDocumentMarkdown,
  useSaveStatus,
} from "@/features/document/hooks/use-document";
import { deriveTitle } from "@/features/document/model/document";
import { exportFileName } from "@/features/document/model/file-name";

import { useLatexConversion } from "../hooks/use-latex-conversion";
import { ConversionAlert } from "./conversion-alert";
import { LatexStatusBar } from "./latex-status-bar";
import { LatexToolbar } from "./latex-toolbar";
import { LatexViewer } from "./latex-viewer";

const SKELETON_WIDTHS = ["w-1/2", "w-2/5", "w-3/5", "w-0", "w-1/3", "w-4/5", "w-2/3"];

function ViewerSkeleton() {
  return (
    <div
      className="space-y-3.5 px-12 py-5"
      aria-busy="true"
      aria-label="Generando el LaTeX"
    >
      {SKELETON_WIDTHS.map((width, index) => (
        <Skeleton key={index} className={`h-3 ${width}`} />
      ))}
    </div>
  );
}

/** The LaTeX pane's content: output options, the generated code and its status. */
export function LatexWorkbench() {
  const [standalone, setStandalone] = useState(true);
  const isLoading = useSaveStatus() === "loading";
  const markdown = useDocumentMarkdown();
  const conversion = useLatexConversion(isLoading ? null : markdown, standalone);

  const deferredMarkdown = useDeferredValue(markdown);
  const fileName = useMemo(
    () => exportFileName(deriveTitle(deferredMarkdown), "tex"),
    [deferredMarkdown],
  );

  return (
    <div className="flex h-full flex-col">
      <LatexToolbar
        // Never hand out code that is about to be replaced by a newer conversion.
        latex={conversion.isPending ? null : conversion.latex}
        standalone={standalone}
        onStandaloneChange={setStandalone}
        fileName={fileName}
      />
      {conversion.error ? (
        <ConversionAlert
          error={conversion.error}
          hasPreviousOutput={conversion.latex !== null}
          onRetry={conversion.retry}
        />
      ) : null}
      <div className="min-h-0 flex-1">
        {conversion.latex === null ? (
          conversion.error ? null : (
            <ViewerSkeleton />
          )
        ) : (
          <LatexViewer latex={conversion.latex} />
        )}
      </div>
      <LatexStatusBar
        latex={conversion.latex}
        isPending={conversion.isPending}
        hasError={conversion.error !== null}
        warnings={conversion.warnings}
      />
    </div>
  );
}
