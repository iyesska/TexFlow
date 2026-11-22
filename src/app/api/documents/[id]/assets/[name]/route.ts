import { deleteAsset, getAsset } from "@/server/assets/assets";
import {
  errorResponse,
  noContent,
  parseId,
  withUser,
} from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/documents/[id]/assets/[name]">;

async function readParams(context: Context) {
  const { id, name } = await context.params;
  return { id: parseId(id), name };
}

/** The version a client says it already has, from If-None-Match. */
function knownVersion(request: Request): string | undefined {
  return request.headers.get("if-none-match")?.match(/^"([a-z0-9-]+)"$/)?.[1];
}

/**
 * An image's bytes. They are served as an image and nothing else: the type stored
 * when the content was checked, no sniffing, and a policy under which the response
 * can run nothing even if opened on its own.
 */
export function GET(request: Request, context: Context): Promise<Response> {
  return withUser(request, async (user) => {
    const { id, name } = await readParams(context);
    const asset = id && (await getAsset(user.id, id, name, knownVersion(request)));
    if (!asset) return errorResponse("not-found");

    const headers = {
      "Content-Type": asset.type,
      ETag: `"${asset.version}"`,
      // Only for this user, and checked with the server each time it is used.
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": `inline; filename="${name}"`,
    };
    if (asset.data === null) return new Response(null, { status: 304, headers });
    return new Response(new Uint8Array(asset.data), { headers });
  });
}

/** Removes an image from the document. */
export function DELETE(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const { id, name } = await readParams(context);
      const deleted = id !== null && (await deleteAsset(user.id, id, name));
      return deleted ? noContent() : errorResponse("not-found");
    },
    { limiter: documentWrites },
  );
}
