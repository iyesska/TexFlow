"use client";

import "katex/dist/katex.min.css";

import { useLayoutEffect, useRef } from "react";

import { documentAttributes } from "@/features/templates/model/preview-style";
import type { DocumentSettings } from "@/templates/settings";

import { renderDocument } from "../model/render-document";
import type { ImageUrls } from "../model/resolve-images";
import { PaperSheet } from "./paper-sheet";

/**
 * The document on its sheets of paper: the body, and before it a cover page when the
 * template asks for one. React renders the sheets; what is inside is written by
 * `renderDocument`, which sanitizes the HTML and patches only what changed.
 */
export function DocumentSheet({
  html,
  images,
  scale,
  settings,
}: {
  html: string;
  images: ImageUrls;
  scale: number;
  settings: DocumentSettings;
}) {
  const bodyRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLElement>(null);
  const hasCoverPage = settings.cover === "page";

  useLayoutEffect(() => {
    if (!bodyRef.current) return;
    renderDocument(
      { body: bodyRef.current, cover: hasCoverPage ? coverRef.current : null },
      html,
      images,
    );
  }, [hasCoverPage, html, images]);

  const attributes = documentAttributes(settings);

  return (
    <div className="flex flex-col gap-5">
      {hasCoverPage ? (
        // A document without a title has no cover; the empty sheet is not shown.
        <PaperSheet scale={scale} className="has-[article:empty]:hidden">
          <article
            ref={coverRef}
            {...attributes}
            className="tf-document tf-cover"
            aria-label="Portada"
          />
        </PaperSheet>
      ) : null}
      <PaperSheet scale={scale}>
        <article
          // A new element when the cover moves, so nothing of the old layout lingers.
          key={hasCoverPage ? "after-cover" : "with-title"}
          ref={bodyRef}
          {...attributes}
          className="tf-document"
          aria-label="Documento"
        />
      </PaperSheet>
    </div>
  );
}
