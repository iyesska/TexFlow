import { convertRequestSchema } from "@/contracts/conversion";
import { env } from "@/config/env";
import { LIMITS } from "@/config/limits";
import { convertMarkdownToLatex } from "@/server/conversion/convert-markdown";
import { handleJsonRoute } from "@/server/http/json-route";
import { conversionRequests } from "@/server/security/limits";

/** Converts a Markdown document to LaTeX. */
export function POST(request: Request): Promise<Response> {
  return handleJsonRoute(request, {
    schema: convertRequestSchema,
    maxBodyBytes: LIMITS.maxDocumentBodyBytes,
    limiter: conversionRequests,
    handle: (input) => convertMarkdownToLatex(input, env.PANDOC_PATH),
  });
}
