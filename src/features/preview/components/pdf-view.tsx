"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { CompileProblems } from "@/features/compilation/components/compile-problems";
import { useCompilation } from "@/features/compilation/hooks/use-compilation";

import { PdfDocument, type PdfDocumentHandle } from "./pdf-document";

/** A strip above the pages saying they no longer match the text, with the way out. */
function StaleNotice({ onCompile }: { onCompile: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-surface-raised/95 px-3 py-1.5 backdrop-blur-sm">
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        El documento ha cambiado desde que se generó este PDF.
      </p>
      <Button size="xs" onClick={onCompile}>
        <RefreshCw />
        Recompilar
      </Button>
    </div>
  );
}

function Compiling({ hasPages }: { hasPages: boolean }) {
  return (
    <div
      role="status"
      className={
        hasPages
          ? "sticky top-0 z-10 flex items-center gap-2 border-b bg-surface-raised/95 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm"
          : "flex h-full min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground"
      }
    >
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      Compilando el PDF…
    </div>
  );
}

/** The PDF side of the preview: the compiled pages, or why there are none. */
export function PdfView({
  scale,
  scrollContainer,
  documentRef,
  onPageCount,
  onPageWidth,
  onCurrentPage,
}: {
  scale: number;
  scrollContainer: HTMLElement | null;
  documentRef: Ref<PdfDocumentHandle>;
  onPageCount: (count: number) => void;
  onPageWidth: (width: number) => void;
  onCurrentPage: (page: number) => void;
}) {
  const { pdf, error, hasProblems, isCompiling, isStale, compile } = useCompilation();

  if (hasProblems && error) {
    return <CompileProblems error={error} onRetry={() => void compile()} />;
  }

  return (
    <>
      {isCompiling ? <Compiling hasPages={pdf !== null} /> : null}
      {!isCompiling && isStale && (pdf !== null || error !== null) ? (
        <StaleNotice onCompile={() => void compile()} />
      ) : null}
      {pdf ? (
        <div className="w-max min-w-full px-5 py-6">
          <PdfDocument
            ref={documentRef}
            data={pdf}
            scale={scale}
            scrollContainer={scrollContainer}
            onPageCount={onPageCount}
            onPageWidth={onPageWidth}
            onCurrentPage={onCurrentPage}
          />
        </div>
      ) : null}
    </>
  );
}
