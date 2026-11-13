"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/features/assets/hooks/use-assets";
import { ConversionAlert } from "@/features/conversion/components/conversion-alert";
import { ConversionStatusBar } from "@/features/conversion/components/conversion-status-bar";
import {
  useDocumentMarkdown,
  useSaveStatus,
} from "@/features/document/hooks/use-document";
import { useElementWidth } from "@/hooks/use-element-width";

import { usePreviewHtml } from "../hooks/use-preview-html";
import { effectiveScale, type ZoomSetting } from "../model/zoom";
import { DocumentSheet } from "./document-sheet";
import { PaperSheet } from "./paper-sheet";
import { PreviewToolbar } from "./preview-toolbar";

const SKELETON_WIDTHS = ["w-2/5", "w-full", "w-11/12", "w-4/5", "w-0", "w-full", "w-3/5"];

function SheetSkeleton({ scale }: { scale: number }) {
  return (
    <PaperSheet scale={scale}>
      <div
        className="space-y-5"
        aria-busy="true"
        aria-label="Componiendo la vista previa"
      >
        {SKELETON_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-4 bg-ink/8 ${width}`} />
        ))}
      </div>
    </PaperSheet>
  );
}

/** The preview pane's content: zoom controls, the document on its sheet, and status. */
export function PreviewWorkbench() {
  const [zoom, setZoom] = useState<ZoomSetting>("fit");
  const { ref: deskRef, width } = useElementWidth<HTMLDivElement>();
  const isLoading = useSaveStatus() === "loading";
  const markdown = useDocumentMarkdown();
  const preview = usePreviewHtml(isLoading ? null : markdown);
  const images = useAssets();

  // Until the pane has been measured there is no sensible scale to draw at.
  const scale = width === null ? null : effectiveScale(zoom, width);

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar
        scale={scale ?? 1}
        isFitted={zoom === "fit"}
        onZoomChange={setZoom}
      />
      {preview.error ? (
        <ConversionAlert
          error={preview.error}
          {...(preview.value !== null
            ? { staleNote: "Se muestra la última vista previa que se pudo generar." }
            : {})}
          onRetry={preview.retry}
        />
      ) : null}
      <div ref={deskRef} className="min-h-0 flex-1 overflow-auto bg-background">
        {scale === null ? null : (
          <div className="w-max min-w-full px-5 py-6">
            {preview.value === null ? (
              preview.error ? null : (
                <SheetSkeleton scale={scale} />
              )
            ) : (
              <DocumentSheet html={preview.value} images={images} scale={scale} />
            )}
          </div>
        )}
      </div>
      <ConversionStatusBar
        isPending={preview.isPending}
        hasError={preview.error !== null}
        warnings={preview.warnings}
        readyLabel="Actualizada"
      />
    </div>
  );
}
