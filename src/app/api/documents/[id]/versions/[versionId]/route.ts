import { versionDto } from "@/server/documents/dto";
import { getVersion } from "@/server/documents/versions";
import { errorResponse, json, parseId, withUser } from "@/server/http/document-route";

/** One version, with its text, design and bibliography. */
export function GET(
  request: Request,
  context: RouteContext<"/api/documents/[id]/versions/[versionId]">,
): Promise<Response> {
  return withUser(request, async (user) => {
    const params = await context.params;
    const id = parseId(params.id);
    const versionId = parseId(params.versionId);
    const version = id && versionId && (await getVersion(user.id, id, versionId));
    return version
      ? json({ ok: true, version: versionDto(version) })
      : errorResponse("not-found", { message: "No se encontró esa versión." });
  });
}
