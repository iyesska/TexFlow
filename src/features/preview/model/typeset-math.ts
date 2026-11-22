/** Typesets one formula and returns its nodes, ready to be placed in the document. */
export type MathRenderer = (tex: string, displayMode: boolean) => DocumentFragment;

const MAX_CACHED_FORMULAS = 2000;

/**
 * Remembers typeset formulas. A document is re-rendered on every pause in typing,
 * and nearly all of its formulas are the same as a moment before. Each call returns a
 * fresh copy, so the caller is free to insert it.
 */
export function createCachedRenderer(render: MathRenderer): MathRenderer {
  const cache = new Map<string, DocumentFragment>();
  return (tex, displayMode) => {
    const key = `${displayMode ? "d" : "i"}:${tex}`;
    let template = cache.get(key);
    if (template === undefined) {
      if (cache.size >= MAX_CACHED_FORMULAS) cache.clear();
      template = render(tex, displayMode);
      cache.set(key, template);
    }
    return template.cloneNode(true) as DocumentFragment;
  };
}

/**
 * Replaces the TeX source inside each `<span class="math">` with typeset math.
 *
 * The TeX is read as text and the result arrives as DOM nodes, so at no point is a
 * string from the document parsed as HTML.
 */
export function typesetMath(root: ParentNode, render: MathRenderer): void {
  for (const span of root.querySelectorAll<HTMLElement>("span.math")) {
    const displayMode = span.classList.contains("display");
    span.replaceChildren(render((span.textContent ?? "").trim(), displayMode));
  }
}
