import katex from "katex";

import { liftTableCaptions } from "./lift-table-captions";
import { patchChildren } from "./patch-children";
import { resolveImages, type ImageUrls } from "./resolve-images";
import { sanitizePreviewHtml } from "./sanitize";
import { createCachedRenderer, typesetMath } from "./typeset-math";

/**
 * KaTeX with its safe defaults made explicit: `trust: false` keeps commands such as
 * \href and \includegraphics inert, and the limits bound the work one formula can
 * demand. A formula with an error is shown in place, in the error colour.
 *
 * `katex.render` builds DOM nodes directly rather than an HTML string.
 */
const renderMath = createCachedRenderer((tex, displayMode) => {
  const fragment = document.createDocumentFragment();
  const holder = fragment.appendChild(document.createElement("span"));
  katex.render(tex, holder, {
    displayMode,
    throwOnError: false,
    errorColor: "var(--paper-error)",
    strict: "ignore",
    trust: false,
    maxExpand: 500,
    maxSize: 40,
  });
  fragment.replaceChildren(...holder.childNodes);
  return fragment;
});

export interface DocumentTargets {
  /** Where the document goes. */
  readonly body: Element;
  /** Where the title block goes when it has a page of its own; null keeps it in place. */
  readonly cover: Element | null;
}

/** Shows the server's preview HTML, safely and incrementally. */
export function renderDocument(
  targets: DocumentTargets,
  html: string,
  images: ImageUrls,
): void {
  const fragment = sanitizePreviewHtml(html);
  liftTableCaptions(fragment);
  typesetMath(fragment, renderMath);
  resolveImages(fragment, images);

  if (targets.cover) {
    const cover = document.createDocumentFragment();
    const titleBlock = Array.from(fragment.children).find((element) =>
      element.matches("header.title-block"),
    );
    if (titleBlock) cover.append(titleBlock);
    patchChildren(targets.cover, cover);
  }
  patchChildren(targets.body, fragment);
}
