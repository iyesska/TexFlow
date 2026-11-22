import { updateDocumentRequestSchema } from "@/contracts/documents";
import {
  getDocument,
  moveDocument,
  renameDocument,
  saveDocumentContent,
  trashDocument,
  type UpdateResult,
} from "@/server/documents/documents";
import { documentDto, summaryDto } from "@/server/documents/dto";
import {
  DOCUMENT_REQUEST_BYTES,
  errorResponse,
  json,
  noContent,
  parseId,
  readRequest,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/documents/[id]">;

/** A document with its text and design. */
export function GET(request: Request, context: Context): Promise<Response> {
  return withUser(request, async (user) => {
    const id = parseId((await context.params).id);
    const document = id && (await getDocument(user.id, id));
    return document
      ? json({ ok: true, document: documentDto(document) })
      : errorResponse("not-found");
  });
}

function updated(result: UpdateResult): Response {
  return result.ok
    ? json({ ok: true, document: summaryDto(result.document) })
    : errorResponse(result.reason);
}

/**
 * Saves a document's content on top of the revision it was edited from, renames it or
 * moves it to a folder. A save made on an older revision is refused with 409 and the
 * current revision, rather than overwriting what another tab or device saved.
 */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      if (!id) return errorResponse("not-found");
      const body = await readRequest(
        request,
        updateDocumentRequestSchema,
        DOCUMENT_REQUEST_BYTES,
      );
      if (!body.ok) return body.response;

      const change = body.value;
      switch (change.action) {
        case "save": {
          const result = await saveDocumentContent(user.id, id, change);
          if (result.ok) {
            return json({
              ok: true,
              revision: result.revision,
              title: result.title,
              updatedAt: result.updatedAt.toISOString(),
            });
          }
          return result.reason === "conflict"
            ? errorResponse("conflict", { revision: result.revision })
            : errorResponse("not-found");
        }
        case "rename":
          return updated(await renameDocument(user.id, id, change.title));
        case "move":
          return updated(await moveDocument(user.id, id, change.folderId));
      }
    },
    { limiter: documentWrites },
  );
}

/** Moves a document to the trash, where it can be restored for 30 days. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      const trashed = id !== null && (await trashDocument(user.id, id));
      return trashed ? noContent() : errorResponse("not-found");
    },
    { limiter: documentWrites },
  );
}
