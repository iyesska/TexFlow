import { renameVersionRequestSchema } from "@/contracts/documents";
import { versionDto, versionSummaryDto } from "@/server/documents/dto";
import { deleteVersion, getVersion, renameVersion } from "@/server/documents/versions";
import {
  errorResponse,
  json,
  noContent,
  parseId,
  readRequest,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/documents/[id]/versions/[versionId]">;

const MAX_BODY_BYTES = 1024;
const NOT_FOUND = { message: "No se encontró esa versión." };

async function ids(context: Context) {
  const params = await context.params;
  return { id: parseId(params.id), versionId: parseId(params.versionId) };
}

/** One version, with its text, design and bibliography. */
export function GET(request: Request, context: Context): Promise<Response> {
  return withUser(request, async (user) => {
    const { id, versionId } = await ids(context);
    const version = id && versionId && (await getVersion(user.id, id, versionId));
    return version
      ? json({ ok: true, version: versionDto(version) })
      : errorResponse("not-found", NOT_FOUND);
  });
}

/** Names a version; an automatic one becomes a named one, kept for good. */
export function PATCH(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const { id, versionId } = await ids(context);
      if (!id || !versionId) return errorResponse("not-found", NOT_FOUND);
      const body = await readRequest(request, renameVersionRequestSchema, MAX_BODY_BYTES);
      if (!body.ok) return body.response;
      const version = await renameVersion(user.id, id, versionId, body.value.label);
      return version
        ? json({ ok: true, version: versionSummaryDto(version) })
        : errorResponse("not-found", NOT_FOUND);
    },
    { limiter: documentWrites },
  );
}

/** Deletes a version from the history. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const { id, versionId } = await ids(context);
      const deleted =
        id !== null &&
        versionId !== null &&
        (await deleteVersion(user.id, id, versionId));
      return deleted ? noContent() : errorResponse("not-found", NOT_FOUND);
    },
    { limiter: documentWrites },
  );
}
