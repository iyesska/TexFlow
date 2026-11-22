import { trashedDto } from "@/server/documents/dto";
import { emptyTrash, listTrash } from "@/server/documents/trash";
import { json, withUser } from "@/server/http/document-route";
import { documentWrites } from "@/server/security/limits";

/** The documents in the trash, most recently deleted first. */
export function GET(request: Request): Promise<Response> {
  return withUser(request, async (user) => {
    const documents = await listTrash(user.id);
    return json({ ok: true, documents: documents.map(trashedDto) });
  });
}

/** Deletes everything in the trash for good. */
export function DELETE(request: Request): Promise<Response> {
  return withUser(
    request,
    async (user) => json({ ok: true, deleted: await emptyTrash(user.id) }),
    { limiter: documentWrites },
  );
}
