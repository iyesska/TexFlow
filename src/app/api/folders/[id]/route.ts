import { folderNameSchema } from "@/contracts/documents";
import { deleteFolder, renameFolder } from "@/server/folders/folders";
import {
  errorResponse,
  json,
  noContent,
  parseId,
  readRequest,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/folders/[id]">;

const MAX_BODY_BYTES = 4 * 1024;

/** Renames a folder. */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      if (!id)
        return errorResponse("not-found", { message: "No se encontró la carpeta." });
      const body = await readRequest(request, folderNameSchema, MAX_BODY_BYTES);
      if (!body.ok) return body.response;
      const result = await renameFolder(user.id, id, body.value.name);
      if (result.ok) return json({ ok: true, folder: result.folder });
      return result.reason === "not-found"
        ? errorResponse("not-found", { message: "No se encontró la carpeta." })
        : errorResponse(result.reason);
    },
    { limiter: documentWrites },
  );
}

/** Deletes a folder. Its documents stay, outside any folder. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      const deleted = id !== null && (await deleteFolder(user.id, id));
      return deleted
        ? noContent()
        : errorResponse("not-found", { message: "No se encontró la carpeta." });
    },
    { limiter: documentWrites },
  );
}
