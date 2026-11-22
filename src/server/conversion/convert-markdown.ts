import "server-only";

import type { ConvertRequest, ConvertResponse } from "@/contracts/conversion";
import { latexLayout, PREAMBLE_FILE } from "@/server/templates/latex-layout";
import { templateById } from "@/templates/catalog";
import type { DocumentSettings } from "@/templates/settings";

import { withPreambleNotes } from "./body-requirements";
import { citationSetup } from "./citations";
import { MARKDOWN_FORMAT, runPandoc } from "./pandoc";

const COMMON_OPTIONS = [`--from=${MARKDOWN_FORMAT}`, "--to=latex", "--wrap=preserve"];

/** A fragment needs no preamble, only the right sectioning commands. */
function bodyOptions(settings: DocumentSettings): string[] {
  const chapters = templateById(settings.templateId).structure === "book";
  return ["--no-highlight", ...(chapters ? ["--top-level-division=chapter"] : [])];
}

/**
 * Converts Markdown to LaTeX with Pandoc, inside the process sandbox: a complete
 * document laid out by the design settings, or a body to paste elsewhere.
 */
export async function convertMarkdownToLatex(
  request: ConvertRequest,
  pandocPath: string,
): Promise<ConvertResponse> {
  const { markdown, standalone, settings } = request;
  const citations = citationSetup(request.bibliography, settings);

  if (!standalone) {
    const result = await runPandoc(
      markdown,
      [...COMMON_OPTIONS, ...bodyOptions(settings), ...citations.options],
      pandocPath,
      citations.files,
    );
    if (!result.ok) return result;
    return {
      ok: true,
      latex: withPreambleNotes(result.output),
      warnings: result.warnings,
    };
  }

  const layout = latexLayout(settings);
  const result = await runPandoc(
    markdown,
    // A whole document can load the listings package for its code blocks.
    [
      ...COMMON_OPTIONS,
      "--standalone",
      "--listings",
      ...layout.options,
      ...citations.options,
    ],
    pandocPath,
    [{ name: PREAMBLE_FILE, data: layout.preamble }, ...citations.files],
  );
  if (!result.ok) return result;
  return { ok: true, latex: result.output, warnings: result.warnings };
}
