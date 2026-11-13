"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ConversionAlert } from "@/features/conversion/components/conversion-alert";
import { ConversionStatusBar } from "@/features/conversion/components/conversion-status-bar";
import {
  useDocumentMarkdown,
  useDocumentSettings,
  useSaveStatus,
} from "@/features/document/hooks/use-document";
import { deriveTitle } from "@/features/document/model/document";
import { exportFileName } from "@/features/document/model/file-name";

import { useLatexConversion } from "../hooks/use-latex-conversion";
import { LatexToolbar } from "./latex-toolbar";
import { LatexViewer } from "./latex-viewer";

const numberFormat = new Intl.NumberFormat("es");

function linesLabel(latex: string): string {
  const count = latex === "" ? 0 : latex.replace(/\n$/, "").split("\n").length;
  return `${numberFormat.format(count)} ${count === 1 ? "línea" : "líneas"}`;
}

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
  const settings = useDocumentSettings();
  const conversion = useLatexConversion(
    isLoading ? null : markdown,
    standalone,
    settings,
  );

  const deferredMarkdown = useDeferredValue(markdown);
  const fileName = useMemo(
    () => exportFileName(deriveTitle(deferredMarkdown), "tex"),
    [deferredMarkdown],
  );

  return (
    <div className="flex h-full flex-col">
      <LatexToolbar
        // Never hand out code that is about to be replaced by a newer conversion.
        latex={conversion.isPending ? null : conversion.value}
        standalone={standalone}
        onStandaloneChange={setStandalone}
        fileName={fileName}
      />
      {conversion.error ? (
        <ConversionAlert
          error={conversion.error}
          {...(conversion.value !== null
            ? { staleNote: "Se muestra el último código que se pudo generar." }
            : {})}
          onRetry={conversion.retry}
        />
      ) : null}
      <div className="min-h-0 flex-1">
        {conversion.value === null ? (
          conversion.error ? null : (
            <ViewerSkeleton />
          )
        ) : (
          <LatexViewer latex={conversion.value} />
        )}
      </div>
      <ConversionStatusBar
        isPending={conversion.isPending}
        hasError={conversion.error !== null}
        warnings={conversion.warnings}
        readyLabel="Actualizado"
      >
        {conversion.value !== null ? linesLabel(conversion.value) : null}
      </ConversionStatusBar>
    </div>
  );
}
