import { previewRequestSchema } from "@/contracts/conversion";
import { env } from "@/config/env";
import { LIMITS } from "@/config/limits";
import { renderPreviewHtml } from "@/server/conversion/render-preview";
import { handleJsonRoute } from "@/server/http/json-route";
import { conversionRequests } from "@/server/security/limits";

/** Renders a Markdown document to the HTML of the quick preview. */
export function POST(request: Request): Promise<Response> {
  return handleJsonRoute(request, {
    schema: previewRequestSchema,
    maxBodyBytes: LIMITS.maxDocumentBodyBytes,
    limiter: conversionRequests,
    handle: (input) => renderPreviewHtml(input, env.PANDOC_PATH),
  });
}
