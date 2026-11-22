import { ASSET_LIMITS } from "@/contracts/assets";
import { ASSET_UPLOAD_FIELD } from "@/contracts/documents";
import { addAsset, listAssets } from "@/server/assets/assets";
import { errorResponse, json, parseId, withUser } from "@/server/http/document-route";
import { readBodyBytes } from "@/server/http/read-body";
import { documentWrites } from "@/server/security/limits";

type Context = RouteContext<"/api/documents/[id]/assets">;

/** Room for the multipart envelope around the largest image. */
const MAX_UPLOAD_BYTES = ASSET_LIMITS.maxBytes + 64 * 1024;

/** The document's images. */
export function GET(request: Request, context: Context): Promise<Response> {
  return withUser(request, async (user) => {
    const id = parseId((await context.params).id);
    const assets = id && (await listAssets(user.id, id));
    return assets ? json({ ok: true, assets }) : errorResponse("not-found");
  });
}

/** Reads the one image of a multipart upload. */
async function readUpload(request: Request): Promise<File | "too-large" | "invalid"> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) return "invalid";
  const body = await readBodyBytes(request, MAX_UPLOAD_BYTES);
  if ("reason" in body) return body.reason === "too-large" ? "too-large" : "invalid";
  try {
    const form = await new Response(new Uint8Array(body.bytes), {
      headers: { "content-type": contentType },
    }).formData();
    const file = form.get(ASSET_UPLOAD_FIELD);
    return file instanceof File ? file : "invalid";
  } catch {
    // aislop-ignore-next-line ai-slop/hidden-fallback -- a body that is not form data is the client's error, answered with 400
    return "invalid";
  }
}

/**
 * Stores an image with the document. Its type is read from its content and the server
 * names it; the answer says under which name.
 */
export function POST(request: Request, context: Context): Promise<Response> {
  return withUser(
    request,
    async (user) => {
      const id = parseId((await context.params).id);
      if (!id) return errorResponse("not-found");
      const file = await readUpload(request);
      if (file === "too-large") {
        return errorResponse("too-large", {
          message: "La imagen pesa más de 5 MB. Redúcela antes de añadirla.",
        });
      }
      if (file === "invalid") return errorResponse("invalid-request");

      const result = await addAsset(
        user.id,
        id,
        file.name,
        new Uint8Array(await file.arrayBuffer()),
      );
      if (result.ok) return json({ ok: true, asset: result.asset }, 201);
      return result.reason === "too-large"
        ? errorResponse("too-large", {
            message: "La imagen pesa más de 5 MB. Redúcela antes de añadirla.",
          })
        : errorResponse(result.reason);
    },
    { limiter: documentWrites },
  );
}
