"use client";

import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/** CSS pixels per PDF point. */
const PX_PER_PT = 96 / 72;
/** Until a page reports its own size, assume A4. */
const A4_PT = { width: 595.28, height: 841.89 };
/** Wait for the zoom to settle before redrawing at the new resolution. */
const RENDER_DELAY_MS = 120;

export interface PdfDocumentHandle {
  scrollToPage(page: number): void;
}

interface PdfDocumentProps {
  /** The PDF file. A new array means a new document. */
  readonly data: Uint8Array;
  readonly scale: number;
  /** The scrolling element that contains the pages. */
  readonly scrollContainer: HTMLElement | null;
  readonly onPageCount: (count: number) => void;
  /** Reports the width of the first page at 100 %, in CSS pixels. */
  readonly onPageWidth: (width: number) => void;
  readonly onCurrentPage: (page: number) => void;
  readonly ref?: Ref<PdfDocumentHandle>;
}

function useLoadedPdf(data: Uint8Array): PDFDocumentProxy | null {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    // pdf.js takes ownership of the bytes it is given; the caller keeps its copy.
    const task = getDocument({ data: data.slice() });
    let cancelled = false;
    task.promise.then(
      (document) => {
        if (!cancelled) setPdf(document);
      },
      () => {},
    );
    return () => {
      cancelled = true;
      // Destroying the task also releases the document and its worker.
      void task.destroy();
    };
  }, [data]);

  return pdf;
}

/** One page: a sheet of the right size, drawn when it comes near the viewport. */
function PdfPage({
  pdf,
  pageNumber,
  scale,
  scrollContainer,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  scrollContainer: HTMLElement | null;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(A4_PT);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry && setIsNear(entry.isIntersecting),
      { root: scrollContainer, rootMargin: "100% 0px" },
    );
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [scrollContainer]);

  useEffect(() => {
    if (!isNear) return;
    let task: RenderTask | undefined;
    let cancelled = false;

    const timer = setTimeout(async () => {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;

      const natural = page.getViewport({ scale: 1 });
      setSize({ width: natural.width, height: natural.height });
      const viewport = page.getViewport({
        scale: PX_PER_PT * scale * window.devicePixelRatio,
      });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      // A render superseded by a newer one rejects; that is expected.
      task.promise.catch(() => {});
    }, RENDER_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [isNear, pdf, pageNumber, scale]);

  return (
    <div
      ref={sheetRef}
      data-page={pageNumber}
      className="mx-auto overflow-hidden rounded-[1px] bg-paper shadow-paper"
      style={{
        width: size.width * PX_PER_PT * scale,
        height: size.height * PX_PER_PT * scale,
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Página ${pageNumber}`}
        className="size-full"
      />
    </div>
  );
}

/** The page whose top has most recently passed the upper third of the viewport. */
function currentPageOf(container: HTMLElement, pages: HTMLElement[]): number {
  const marker = container.getBoundingClientRect().top + container.clientHeight / 3;
  let current = 1;
  for (const page of pages) {
    if (page.getBoundingClientRect().top <= marker) current = Number(page.dataset.page);
  }
  return current;
}

/** A compiled PDF, shown as a column of pages. */
export function PdfDocument({
  data,
  scale,
  scrollContainer,
  onPageCount,
  onPageWidth,
  onCurrentPage,
  ref,
  className,
}: PdfDocumentProps & { className?: string }) {
  const pdf = useLoadedPdf(data);
  const listRef = useRef<HTMLDivElement>(null);
  const pageCount = pdf?.numPages ?? 0;

  const pageElements = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-page]") ?? []);

  useImperativeHandle(ref, () => ({
    scrollToPage(page) {
      pageElements()
        .find((element) => Number(element.dataset.page) === page)
        ?.scrollIntoView({ block: "start" });
    },
  }));

  useEffect(() => {
    onPageCount(pageCount);
  }, [onPageCount, pageCount]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void pdf.getPage(1).then((page) => {
      if (!cancelled) onPageWidth(page.getViewport({ scale: 1 }).width * PX_PER_PT);
    });
    return () => {
      cancelled = true;
    };
  }, [onPageWidth, pdf]);

  useEffect(() => {
    if (!scrollContainer || pageCount === 0) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        onCurrentPage(currentPageOf(scrollContainer, pageElements())),
      );
    };
    update();
    scrollContainer.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", update);
    };
  }, [onCurrentPage, pageCount, scrollContainer]);

  if (!pdf) return null;
  return (
    <div ref={listRef} className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: pageCount }, (_, index) => (
        <PdfPage
          key={index + 1}
          pdf={pdf}
          pageNumber={index + 1}
          scale={scale}
          scrollContainer={scrollContainer}
        />
      ))}
    </div>
  );
}
