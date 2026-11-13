import "server-only";

import type { ConvertRequest, ConvertResponse } from "@/contracts/conversion";

import { withPreambleNotes } from "./body-requirements";
import { MARKDOWN_FORMAT, runPandoc } from "./pandoc";

function latexOptions(standalone: boolean): string[] {
  return [
    `--from=${MARKDOWN_FORMAT}`,
    "--to=latex",
    "--wrap=preserve",
    // A whole document can load the listings package; a fragment must stand alone.
    ...(standalone ? ["--standalone", "--listings"] : ["--no-highlight"]),
  ];
}

/** Converts Markdown to LaTeX with Pandoc, inside the process sandbox. */
export async function convertMarkdownToLatex(
  request: ConvertRequest,
  pandocPath: string,
): Promise<ConvertResponse> {
  const result = await runPandoc(
    request.markdown,
    latexOptions(request.standalone),
    pandocPath,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    latex: request.standalone ? result.output : withPreambleNotes(result.output),
    warnings: result.warnings,
  };
}
