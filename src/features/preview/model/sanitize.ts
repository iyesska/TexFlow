import createDOMPurify from "dompurify";

import { PREVIEW_ID_PREFIX } from "@/contracts/conversion";

/**
 * The preview's trust boundary.
 *
 * The server sends HTML that Pandoc wrote from the author's Markdown. Raw HTML has
 * already been removed there, but link targets, attributes and styles still come from
 * the document, so nothing reaches the page without passing through here.
 */

const ALLOWED_TAGS = [
  ..."a abbr aside blockquote br caption cite code col colgroup dd del div dl dt em".split(
    " ",
  ),
  ..."figcaption figure h1 h2 h3 h4 h5 h6 header hr img input kbd label li mark nav ol p".split(
    " ",
  ),
  ..."pre q s section small span strong sub sup table tbody td tfoot th thead tr u ul".split(
    " ",
  ),
];

const ALLOWED_ATTR = [
  ..."alt aria-hidden checked class colspan disabled href id role rowspan src start".split(
    " ",
  ),
  ..."style title type".split(" "),
];

/**
 * http(s), mailto, and anything without a scheme (anchors, relative paths). No
 * `javascript:`, no `data:`. DOMPurify also tests plain attribute values such as
 * type="checkbox" against this, which the last alternative lets through.
 */
const ALLOWED_URI = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/** The only declarations Pandoc itself writes: column alignment and widths. */
const SAFE_DECLARATION =
  /^(?:text-align:\s*(?:left|right|center|justify)|width:\s*(?:\d{1,2}(?:\.\d+)?|100(?:\.0+)?)%)$/i;

function safeStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => SAFE_DECLARATION.test(declaration))
    .join("; ");
}

const purify = createDOMPurify(window);

purify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style") {
    data.attrValue = safeStyle(data.attrValue);
    data.keepAttr = data.attrValue !== "";
  }
  // Ids outside the preview's namespace could shadow the app's own elements.
  if (data.attrName === "id" && !data.attrValue.startsWith(PREVIEW_ID_PREFIX)) {
    data.keepAttr = false;
  }
});

purify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof HTMLAnchorElement && !node.getAttribute("href")?.startsWith("#")) {
    node.target = "_blank";
    node.rel = "noopener noreferrer nofollow";
  }
  if (node instanceof HTMLInputElement) {
    // Task-list checkboxes only, and only for show.
    if (node.type !== "checkbox") node.remove();
    else node.disabled = true;
  }
});

/** Parses untrusted preview HTML into a fragment that is safe to attach to the page. */
export function sanitizePreviewHtml(html: string): DocumentFragment {
  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
}
