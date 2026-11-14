"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/features/assets/hooks/use-assets";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";
import { ConversionAlert } from "@/features/conversion/components/conversion-alert";
import { ConversionStatusBar } from "@/features/conversion/components/conversion-status-bar";
import {
  useDocumentMarkdown,
  useDocumentSettings,
} from "@/features/document/hooks/use-document";
import { pageWidthPx, previewStyle } from "@/features/templates/model/preview-style";
import { useElementWidth } from "@/hooks/use-element-width";

import { usePreviewHtml } from "../hooks/use-preview-html";
import { effectiveScale, type ZoomSetting } from "../model/zoom";
import { DocumentSheet } from "./document-sheet";
import { PaperSheet } from "./paper-sheet";
import type { PdfDocumentHandle } from "./pdf-document";
import { PdfView } from "./pdf-view";
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

function pdfStatus(compilation: ReturnType<typeof useCompilation>): string {
  if (compilation.isCompiling) return "Compilando…";
  if (compilation.hasProblems) return "Con errores";
  if (compilation.pdf === null) return "Sin compilar";
  return compilation.isStale ? "Desactualizado" : "PDF al día";
}

/** The preview pane's content: the quick preview or the PDF, with zoom and status. */
export function PreviewWorkbench() {
  const [zoom, setZoom] = useState<ZoomSetting>("fit");
  const [desk, setDesk] = useState<HTMLDivElement | null>(null);
  const { ref: widthRef, width } = useElementWidth<HTMLDivElement>();
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPageWidth, setPdfPageWidth] = useState<number | undefined>(undefined);
  const pdfRef = useRef<PdfDocumentHandle>(null);

  const markdown = useDocumentMarkdown();
  const compilation = useCompilation();
  const { mode } = compilation;
  // The quick preview only works while it is the one on screen.
  const settings = useDocumentSettings();
  const preview = usePreviewHtml(mode !== "quick" ? null : markdown, settings);
  const images = useAssets();

  // Opening the PDF view compiles the document if what is there is out of date.
  const compileIfStale = useEffectEvent(() => {
    if (compilation.isStale && !compilation.isCompiling) void compilation.compile();
  });
  useEffect(() => {
    if (mode === "pdf") compileIfStale();
  }, [mode]);

  // Until the pane has been measured there is no sensible scale to draw at.
  // The PDF's pages have their own size; the quick preview's sheet is always A4.
  const sheetWidth = mode === "pdf" ? pdfPageWidth : pageWidthPx(settings);
  const scale = width === null ? null : effectiveScale(zoom, width, sheetWidth);
  const showsPages =
    mode === "pdf" &&
    compilation.pdf !== null &&
    !compilation.hasProblems &&
    pageCount > 0;

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar
        mode={mode}
        onModeChange={compilation.setMode}
        scale={scale}
        isFitted={zoom === "fit"}
        onZoomChange={setZoom}
        {...(showsPages
          ? {
              pages: {
                current: currentPage,
                count: pageCount,
                goTo: (page) => pdfRef.current?.scrollToPage(page),
              },
            }
          : {})}
      />
      {mode === "quick" && preview.error ? (
        <ConversionAlert
          error={preview.error}
          {...(preview.value !== null
            ? { staleNote: "Se muestra la última vista previa que se pudo generar." }
            : {})}
          onRetry={preview.retry}
        />
      ) : null}
      <div
        ref={(element) => {
          setDesk(element);
          return widthRef(element);
        }}
        className="min-h-0 flex-1 overflow-auto bg-background"
      >
        {scale === null ? null : mode === "pdf" ? (
          <PdfView
            scale={scale}
            scrollContainer={desk}
            documentRef={pdfRef}
            onPageCount={setPageCount}
            onPageWidth={setPdfPageWidth}
            onCurrentPage={setCurrentPage}
          />
        ) : (
          // The template's page, type and language, for the sheets inside.
          <div className="w-max min-w-full px-5 py-6" style={previewStyle(settings)}>
            {preview.value === null ? (
              preview.error ? null : (
                <SheetSkeleton scale={scale} />
              )
            ) : (
              <DocumentSheet
                html={preview.value}
                images={images}
                scale={scale}
                settings={settings}
              />
            )}
          </div>
        )}
      </div>
      {mode === "pdf" ? (
        <div className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
          <span>{pdfStatus(compilation)}</span>
          {compilation.warnings.length > 0 && !compilation.isStale ? (
            <span
              className="truncate text-warning"
              title={compilation.warnings.map(({ message }) => message).join("\n")}
            >
              {compilation.warnings.length === 1
                ? "1 aviso de LaTeX"
                : `${compilation.warnings.length} avisos de LaTeX`}
            </span>
          ) : null}
        </div>
      ) : (
        <ConversionStatusBar
          isPending={preview.isPending}
          hasError={preview.error !== null}
          warnings={preview.warnings}
          readyLabel="Actualizada"
        />
      )}
    </div>
  );
}
