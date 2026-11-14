import { LIMITS } from "@/config/limits";
import { namedVersionRequestSchema } from "@/contracts/documents";
import { versionSummaryDto } from "@/server/documents/dto";
import { keepNamedVersion, listVersions } from "@/server/documents/versions";
import {
  errorResponse,
  json,
  parseId,
  readRequest,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/documents/[id]/versions">;

/** The document's history, newest first, without the content of each version. */
export function GET(request: Request, context: Context): Promise<Response> {
  return withUser(request, async (user) => {
    const id = parseId((await context.params).id);
    const versions = id && (await listVersions(user.id, id));
    return versions
      ? json({ ok: true, versions: versions.map(versionSummaryDto) })
      : errorResponse("not-found");
  });
}

/** Keeps the document as it is stored now with a name, or the content sent with it. */
export function POST(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      if (!id) return errorResponse("not-found");
      const body = await readRequest(
        request,
        namedVersionRequestSchema,
        LIMITS.maxDocumentBodyBytes,
      );
      if (!body.ok) return body.response;
      const { label, content } = body.value;
      const version = await keepNamedVersion(user.id, id, label, content);
      return version
        ? json({ ok: true, version: versionSummaryDto(version) }, 201)
        : errorResponse("not-found");
    },
    { limiter: documentWrites },
  );
}
