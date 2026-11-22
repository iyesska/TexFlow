import { restoreRequestSchema } from "@/contracts/documents";
import { documentDto, versionSummaryDto } from "@/server/documents/dto";
import { restoreVersion } from "@/server/documents/versions";
import {
  errorResponse,
  json,
  parseId,
  readRequest,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

const MAX_BODY_BYTES = 1024;

/**
 * Puts a version's content back. The state it replaces is kept as a version first. A
 * document changed since the writer last saw it is not touched: 409, as for a save.
 */
export function POST(
  request: Request,
  context: RouteContext<"/api/documents/[id]/versions/[versionId]/restore">,
): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const params = await context.params;
      const id = parseId(params.id);
      const versionId = parseId(params.versionId);
      if (!id || !versionId) return errorResponse("not-found");
      const body = await readRequest(request, restoreRequestSchema, MAX_BODY_BYTES);
      if (!body.ok) return body.response;

      const result = await restoreVersion(
        user.id,
        id,
        versionId,
        body.value.baseRevision,
      );
      if (result.ok) {
        return json({
          ok: true,
          document: documentDto(result.document),
          kept: versionSummaryDto(result.kept),
        });
      }
      return result.reason === "conflict"
        ? errorResponse("conflict", { revision: result.revision })
        : errorResponse("not-found", { message: "No se encontró esa versión." });
    },
    { limiter: documentWrites },
  );
}
