import { createDocumentRequestSchema } from "@/contracts/documents";
import { createDocument, listDocuments } from "@/server/documents/documents";
import { summaryDto } from "@/server/documents/dto";
import { listFolders } from "@/server/folders/folders";
import {
  DOCUMENT_REQUEST_BYTES,
  errorResponse,
  json,
  readRequest,
  TOO_MANY_DOCUMENTS,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

/** The user's documents, most recently changed first, and their folders. */
export function GET(request: Request): Promise<Response> {
  return withUser(request, async (user) => {
    const [documents, folders] = await Promise.all([
      listDocuments(user.id),
      listFolders(user.id),
    ]);
    return json({ ok: true, documents: documents.map(summaryDto), folders });
  });
}

/** Creates a document, empty or with the text and design given. */
export function POST(request: Request): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const body = await readRequest(
        request,
        createDocumentRequestSchema,
        DOCUMENT_REQUEST_BYTES,
      );
      if (!body.ok) return body.response;
      const result = await createDocument(user.id, body.value);
      if (!result.ok) {
        return result.reason === "too-many"
          ? errorResponse("too-many", { message: TOO_MANY_DOCUMENTS })
          : errorResponse("folder-not-found");
      }
      return json({ ok: true, document: summaryDto(result.document) }, 201);
    },
    { limiter: documentWrites },
  );
}
