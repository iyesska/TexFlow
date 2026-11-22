import { folderNameSchema } from "@/contracts/documents";
import { createFolder, listFolders } from "@/server/folders/folders";
import {
  errorResponse,
  json,
  readRequest,
  TOO_MANY_FOLDERS,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

const MAX_BODY_BYTES = 4 * 1024;

/** The user's folders, by name, with how many documents each holds. */
export function GET(request: Request): Promise<Response> {
  return withUser(request, async (user) =>
    json({ ok: true, folders: await listFolders(user.id) }),
  );
}

/** Creates a folder. Names are unique per user. */
export function POST(request: Request): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const body = await readRequest(request, folderNameSchema, MAX_BODY_BYTES);
      if (!body.ok) return body.response;
      const result = await createFolder(user.id, body.value.name);
      if (result.ok) return json({ ok: true, folder: result.folder }, 201);
      return result.reason === "too-many"
        ? errorResponse("too-many", { message: TOO_MANY_FOLDERS })
        : errorResponse(result.reason);
    },
    { limiter: documentWrites },
  );
}
