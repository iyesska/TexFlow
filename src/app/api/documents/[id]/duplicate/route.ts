import { duplicateDocument } from "@/server/documents/documents";
import { summaryDto } from "@/server/documents/dto";
import {
  errorResponse,
  json,
  parseId,
  TOO_MANY_DOCUMENTS,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

/** Copies a document, with its design and images. */
export function POST(
  request: Request,
  context: RouteContext<"/api/documents/[id]/duplicate">,
): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      if (!id) return errorResponse("not-found");
      const result = await duplicateDocument(user.id, id);
      if (result.ok)
        return json({ ok: true, document: summaryDto(result.document) }, 201);
      return result.reason === "too-many"
        ? errorResponse("too-many", { message: TOO_MANY_DOCUMENTS })
        : errorResponse("not-found");
    },
    { limiter: documentWrites },
  );
}
