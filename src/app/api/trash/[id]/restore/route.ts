import { summaryDto } from "@/server/documents/dto";
import { restoreDocument } from "@/server/documents/trash";
import { errorResponse, json, parseId, withUser } from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

/** Takes a document out of the trash, back to its folder if that still exists. */
export function POST(
  request: Request,
  context: RouteContext<"/api/trash/[id]/restore">,
): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      const document = id === null ? null : await restoreDocument(user.id, id);
      return document
        ? json({ ok: true, document: summaryDto(document) })
        : errorResponse("not-found", {
            message: "Ese documento no está en la papelera.",
          });
    },
    { limiter: documentWrites },
  );
}
