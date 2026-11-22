// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { documentSummarySchema, trashedDocumentSchema } from "@/contracts/documents";
import type { SessionUser } from "@/server/auth/session";
import { createDocument, trashDocument } from "@/server/documents/documents";
import { createTestUser, databaseAvailable } from "@/server/testing/database";
import { apiRequest, routeContext } from "@/server/testing/requests";
import { signInAs } from "@/server/testing/session-mock";
import { DEFAULT_SETTINGS } from "@/templates/catalog";

import { POST as restore } from "./[id]/restore/route";
import { DELETE as deleteForever } from "./[id]/route";
import { DELETE as empty, GET } from "./route";

vi.mock("@/server/auth/session", () => import("@/server/testing/session-mock"));

let user: SessionUser;

async function trashed(markdown: string): Promise<string> {
  const created = await createDocument(user.id, { markdown, settings: DEFAULT_SETTINGS });
  if (!created.ok) throw new Error(created.reason);
  await trashDocument(user.id, created.document.id);
  return created.document.id;
}

const list = async () =>
  trashedDocumentSchema
    .array()
    .parse((await (await GET(apiRequest("GET", "/api/trash"))).json()).documents);

describe.skipIf(!databaseAvailable)("/api/trash", () => {
  beforeEach(async () => {
    user = await createTestUser();
    signInAs(user);
  });

  it("lists the trash and restores a document from it", async () => {
    const id = await trashed("# Borrador");
    expect(await list()).toMatchObject([{ id, title: "Borrador" }]);

    const response = await restore(
      apiRequest("POST", `/api/trash/${id}/restore`),
      routeContext({ id }),
    );
    expect(response.status).toBe(200);
    expect(documentSummarySchema.parse((await response.json()).document).id).toBe(id);
    expect(await list()).toEqual([]);

    const again = await restore(
      apiRequest("POST", `/api/trash/${id}/restore`),
      routeContext({ id }),
    );
    expect(again.status).toBe(404);
  });

  it("deletes one document for good, or empties the whole trash", async () => {
    const one = await trashed("# Uno");
    await trashed("# Dos");
    await trashed("# Tres");

    const response = await deleteForever(
      apiRequest("DELETE", `/api/trash/${one}`),
      routeContext({ id: one }),
    );
    expect(response.status).toBe(204);
    expect((await list()).map(({ title }) => title)).toEqual(["Tres", "Dos"]);

    const emptied = await empty(apiRequest("DELETE", "/api/trash"));
    expect(await emptied.json()).toEqual({ ok: true, deleted: 2 });
    expect(await list()).toEqual([]);
  });

  it("keeps each trash to its owner", async () => {
    const id = await trashed("# Privado");
    signInAs(await createTestUser());
    expect(await list()).toEqual([]);
    const response = await deleteForever(
      apiRequest("DELETE", `/api/trash/${id}`),
      routeContext({ id }),
    );
    expect(response.status).toBe(404);
  });
});
