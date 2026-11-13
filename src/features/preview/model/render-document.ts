import katex from "katex";

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

/** Shows the server's preview HTML inside `container`, safely and incrementally. */
export function renderDocument(
  container: Element,
  html: string,
  images: ImageUrls,
): void {
  const fragment = sanitizePreviewHtml(html);
  typesetMath(fragment, renderMath);
  resolveImages(fragment, images);
  patchChildren(container, fragment);
}
