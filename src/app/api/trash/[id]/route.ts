import { deleteForever } from "@/server/documents/trash";
import {
  errorResponse,
  noContent,
  parseId,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

/** Deletes a document in the trash for good, with its images and its history. */
export function DELETE(
  request: Request,
  context: RouteContext<"/api/trash/[id]">,
): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      const deleted = id !== null && (await deleteForever(user.id, id));
      return deleted ? noContent() : errorResponse("not-found");
    },
    { limiter: documentWrites },
  );
}
