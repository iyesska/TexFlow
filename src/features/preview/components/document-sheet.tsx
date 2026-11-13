"use client";

import "katex/dist/katex.min.css";

import { useLayoutEffect, useRef } from "react";

import type { ImageUrls } from "../model/resolve-images";
import { renderDocument } from "../model/render-document";
import { PaperSheet } from "./paper-sheet";

/**
 * The document on its sheet of paper. React renders the sheet; the document inside is
 * written by `renderDocument`, which sanitizes the HTML and patches only what changed.
 */
export function DocumentSheet({
  html,
  images,
  scale,
}: {
  html: string;
  images: ImageUrls;
  scale: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current) renderDocument(contentRef.current, html, images);
  }, [html, images]);

  return (
    <PaperSheet scale={scale}>
      <article ref={contentRef} className="tf-document" aria-label="Documento" />
    </PaperSheet>
  );
}
