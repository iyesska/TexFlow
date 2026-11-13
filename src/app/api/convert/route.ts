import { convertRequestSchema } from "@/contracts/conversion";
import { env } from "@/config/env";
import { LIMITS } from "@/config/limits";
import { convertMarkdownToLatex } from "@/server/conversion/convert-markdown";
import { handleJsonRoute } from "@/server/http/json-route";

/** Converts a Markdown document to LaTeX. */
export function POST(request: Request): Promise<Response> {
  return handleJsonRoute(request, {
    schema: convertRequestSchema,
    maxBodyBytes: LIMITS.maxDocumentBodyBytes,
    handle: (input) => convertMarkdownToLatex(input, env.PANDOC_PATH),
  });
}
