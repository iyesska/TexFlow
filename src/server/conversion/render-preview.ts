import "server-only";

import {
  PREVIEW_ID_PREFIX,
  type PreviewRequest,
  type PreviewResponse,
} from "@/contracts/conversion";
import { previewLayoutOptions } from "@/server/templates/latex-layout";
import type { DocumentSettings } from "@/templates/settings";

import { MARKDOWN_FORMAT, pandocResource, runPandoc } from "./pandoc";

function previewOptions(settings: DocumentSettings): string[] {
  return [
    // Without native divs and spans, HTML tags in the document are raw HTML, which the
    // filter below removes, instead of elements carrying the author's attributes.
    `--from=${MARKDOWN_FORMAT}-native_divs-native_spans`,
    "--to=html5",
    // Leaves formulas as TeX inside <span class="math ...">; the client typesets them.
    "--katex",
    "--no-highlight",
    "--wrap=none",
    `--id-prefix=${PREVIEW_ID_PREFIX}`,
    `--lua-filter=${pandocResource("filters", "strip-raw.lua")}`,
    `--template=${pandocResource("templates", "preview.html")}`,
    // A template makes Pandoc expect a page title and warn without one. Ours has no
    // <title>, so any value satisfies it.
    "--metadata=pagetitle:preview",
    ...previewLayoutOptions(settings),
  ];
}

/**
 * Renders Markdown to an HTML fragment for the quick preview.
 *
 * The fragment still reflects what the author wrote (link targets, attributes), so it
 * is untrusted: the client sanitizes it before showing it.
 */
export async function renderPreviewHtml(
  request: PreviewRequest,
  pandocPath: string,
): Promise<PreviewResponse> {
  const result = await runPandoc(
    request.markdown,
    previewOptions(request.settings),
    pandocPath,
  );
  if (!result.ok) return result;
  return { ok: true, html: result.output, warnings: result.warnings };
}
