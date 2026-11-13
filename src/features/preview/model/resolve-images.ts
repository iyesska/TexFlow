/** Maps an image name used in the Markdown to a URL the browser can load. */
export type ImageUrls = ReadonlyMap<string, { readonly url: string }>;

const REMOTE = /^(?:https?:)?\/\//i;

function placeholder(document: Document, message: string, detail: string): HTMLElement {
  const box = document.createElement("span");
  box.className = "missing-image";
  box.setAttribute("role", "img");
  box.setAttribute("aria-label", `${message} ${detail}`);

  const title = document.createElement("strong");
  title.textContent = message;
  const source = document.createElement("code");
  source.textContent = detail;
  box.append(title, source);
  return box;
}

/**
 * Points each image at the document's own copy of it.
 *
 * Only images added to the document are shown. Remote images are replaced by a note:
 * the PDF is compiled without network access, so showing them here would promise
 * something the final document cannot keep.
 */
export function resolveImages(root: ParentNode, images: ImageUrls): void {
  for (const image of root.querySelectorAll("img")) {
    const source = image.getAttribute("src") ?? "";
    const asset = images.get(source.replace(/^\.\//, ""));
    if (asset) {
      image.src = asset.url;
      continue;
    }
    const message = REMOTE.test(source)
      ? "Imagen remota: añádela al documento para incluirla."
      : "Imagen no encontrada.";
    image.replaceWith(placeholder(image.ownerDocument, message, source || "(sin ruta)"));
  }
}
